/**
 * Automated meme generation for dramatic probability shifts.
 * Detects >20% moves and generates shareable before/after cards.
 */

import { db } from "@/lib/db";
import { markets, probabilitySnapshots } from "@/lib/db/schema";
import { eq, gte, desc } from "drizzle-orm";
import { chatCompletion } from "./llm";
import { loggers } from "@/lib/logger";

export type MemeText = {
  topText: string;
  bottomText: string;
};

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) return jsonBlock[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last >= first) return trimmed.slice(first, last + 1);
  return trimmed;
}

/**
 * Detect markets with >threshold% probability shift in the last 24 hours.
 */
export async function detectDramaticShifts(
  threshold = 20
): Promise<
  Array<{
    marketId: string;
    title: string;
    category: string;
    oldProbability: number;
    newProbability: number;
    shift: number;
  }>
> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recent = await db
    .select({
      marketId: probabilitySnapshots.marketId,
      probability: probabilitySnapshots.probability,
      recordedAt: probabilitySnapshots.recordedAt,
    })
    .from(probabilitySnapshots)
    .where(gte(probabilitySnapshots.recordedAt, oneDayAgo))
    .orderBy(desc(probabilitySnapshots.recordedAt));

  // Group by market, find min and max
  const byMarket = new Map<
    string,
    { earliest: number; latest: number; earliestAt: Date; latestAt: Date }
  >();
  for (const r of recent) {
    const p = Number(r.probability);
    const cur = byMarket.get(r.marketId);
    if (!cur) {
      byMarket.set(r.marketId, {
        earliest: p,
        latest: p,
        earliestAt: r.recordedAt,
        latestAt: r.recordedAt,
      });
    } else {
      if (r.recordedAt < cur.earliestAt) {
        cur.earliest = p;
        cur.earliestAt = r.recordedAt;
      }
      if (r.recordedAt > cur.latestAt) {
        cur.latest = p;
        cur.latestAt = r.recordedAt;
      }
    }
  }

  const shifts: Array<{
    marketId: string;
    title: string;
    category: string;
    oldProbability: number;
    newProbability: number;
    shift: number;
  }> = [];

  for (const [marketId, data] of byMarket) {
    const shift = Math.abs(data.latest - data.earliest);
    if (shift >= threshold) {
      const [market] = await db
        .select({ title: markets.title, category: markets.category })
        .from(markets)
        .where(eq(markets.id, marketId))
        .limit(1);
      if (market) {
        shifts.push({
          marketId,
          title: market.title,
          category: market.category,
          oldProbability: Math.round(data.earliest),
          newProbability: Math.round(data.latest),
          shift: Math.round(data.latest - data.earliest),
        });
      }
    }
  }

  return shifts.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
}

/**
 * Generate meme text for a dramatic probability shift using AI.
 */
export async function generateMemeText(
  marketTitle: string,
  oldProb: number,
  newProb: number
): Promise<MemeText> {
  const shift = newProb - oldProb;
  const direction = shift > 0 ? "up" : "down";

  try {
    const prompt = `You are a meme-savvy social media editor for The Future Express, a prediction market newspaper.
A prediction market just had a DRAMATIC shift. Generate short, punchy text for a before/after meme card.

MARKET: "${marketTitle}"
OLD ODDS: ${oldProb}%
NEW ODDS: ${newProb}%
SHIFT: ${Math.abs(shift)} points ${direction}

Generate a "before/after" style meme with two lines:
- topText: A short quip about the old odds (max 60 chars, witty/ironic)
- bottomText: A short punchline about the new odds (max 60 chars, dramatic)

The humor should be wry and accessible. Think "financial meme Twitter."

Respond with valid JSON only:
{"topText": "...", "bottomText": "..."}`;

    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: 0.9,
    });

    const cleaned = extractJson(result.content);
    const parsed = JSON.parse(cleaned) as MemeText;

    if (parsed.topText && parsed.bottomText) {
      return {
        topText: parsed.topText.slice(0, 80),
        bottomText: parsed.bottomText.slice(0, 80),
      };
    }
  } catch (e) {
    loggers.articles.warn({ err: e, marketTitle }, "Meme text generation failed, using fallback");
  }

  // Fallback: simple before/after text
  return {
    topText: `"${marketTitle.slice(0, 40)}${marketTitle.length > 40 ? "..." : ""}" was at ${oldProb}%`,
    bottomText: `Now it's ${newProb}%. The market has spoken.`,
  };
}
