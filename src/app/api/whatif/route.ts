import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getArticleLLM } from "@/lib/articles/llm";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// ── In-memory rate limiter: max 3 requests per IP per hour ──────────────────
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// ── SSE helpers ──────────────────────────────────────────────────────────────
function sseChunk(text: string): string {
  return `data: ${JSON.stringify({ text })}\n\n`;
}

function sseDone(): string {
  return `data: ${JSON.stringify({ done: true })}\n\n`;
}

function sseError(message: string): string {
  return `data: ${JSON.stringify({ error: message })}\n\n`;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Resolve client IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Rate limit check
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      sseError("Rate limit reached. You can generate 3 scenarios per hour.") + sseDone(),
      {
        status: 429,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  // Parse and validate body
  let marketId: string;
  let scenario: string;
  try {
    const body = await req.json();
    marketId = typeof body.marketId === "string" ? body.marketId.trim() : "";
    scenario = typeof body.scenario === "string" ? body.scenario.trim() : "";
  } catch {
    return new Response(sseError("Invalid request body.") + sseDone(), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  if (!marketId || !scenario) {
    return new Response(sseError("marketId and scenario are required.") + sseDone(), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  if (scenario.length > 200) {
    return new Response(sseError("Scenario must be 200 characters or fewer.") + sseDone(), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  // Fetch market from DB
  const rows = await db
    .select({
      title: markets.title,
      currentProbability: markets.currentProbability,
      kalshiTicker: markets.kalshiTicker,
    })
    .from(markets)
    .where(eq(markets.id, marketId))
    .limit(1);

  if (!rows[0]) {
    return new Response(sseError("Market not found.") + sseDone(), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const market = rows[0];
  const prob = market.currentProbability
    ? Math.round(parseFloat(String(market.currentProbability)))
    : 50;
  const sourceExchange = market.kalshiTicker ? "Polymarket & Kalshi" : "Polymarket";

  const systemPrompt =
    "You are a sharp-tongued political analyst writing for a retro newspaper. You write in vivid, present-tense newspaper prose.";

  const userPrompt =
    `MARKET: ${market.title} (currently ${prob}% probability, source: ${sourceExchange})\n` +
    `SCENARIO: What if ${scenario}?\n\n` +
    `Write a 3-paragraph newspaper analysis exploring this alternative future. Include: what would need to happen, the cascading effects, and how it changes the overall odds. Be specific and vivid. Max 250 words.`;

  const llm = getArticleLLM();

  // Build a streaming SSE response using ReadableStream
  const stream = new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder();
      const enqueue = (chunk: string) => ctrl.enqueue(encoder.encode(chunk));

      try {
        if (llm.kind === "anthropic") {
          // Native Anthropic streaming
          const response = await (llm.client as Anthropic).messages.stream({
            model: llm.model,
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          });

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              enqueue(sseChunk(event.delta.text));
            }
          }
        } else {
          // OpenAI-compatible streaming (OpenAI, OpenRouter)
          const response = await (llm.client as OpenAI).chat.completions.create({
            model: llm.model,
            stream: true,
            max_tokens: 512,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });

          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              enqueue(sseChunk(text));
            }
          }
        }

        enqueue(sseDone());
      } catch (err) {
        console.error("[whatif] LLM streaming error:", err);
        enqueue(sseError("Generation failed. Please try again."));
        enqueue(sseDone());
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
