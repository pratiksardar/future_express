import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeX402PaymentForImage } from "@/lib/kite/client";

// ==========================================
// AI MODEL CONFIGURATION
// ==========================================
// Change these values to quickly switch the models used throughout the app.
export const AI_MODELS = {
  // Text generation model (used for articles and editor persona)
  TEXT_MODEL: "arcee-ai/trinity-mini:free",

  // Image generation model (used for vintage newspaper photos)
  IMAGE_MODEL: "sourceful/riverflow-v2-fast:free"
};

// ==========================================
// LLM PROVIDER TYPES
// ==========================================

/** Supported LLM provider identifiers. */
export type LLMProvider = "openai" | "openrouter" | "anthropic";

/** The shape returned by getArticleLLM for OpenAI-compatible providers. */
export type OpenAICompatibleLLM = {
  kind: "openai-compatible";
  client: OpenAI;
  model: string;
  supportsJsonMode: boolean;
  provider: LLMProvider;
};

/** The shape returned by getArticleLLM for the native Anthropic provider. */
export type AnthropicLLM = {
  kind: "anthropic";
  client: Anthropic;
  model: string;
  supportsJsonMode: boolean;
  provider: "anthropic";
};

/** Unified LLM handle. Callers can branch on `kind` if needed. */
export type ArticleLLM = OpenAICompatibleLLM | AnthropicLLM;

// ==========================================
// PROVIDER PRIORITY & FALLBACK
// ==========================================

/**
 * Reads LLM_PROVIDER_PRIORITY from env (comma-separated, e.g. "anthropic,openai,openrouter").
 * Only returns providers that have a valid API key configured.
 */
export function getProviderPriority(): LLMProvider[] {
  const raw = process.env.LLM_PROVIDER_PRIORITY ?? "openrouter,openai,anthropic";
  const all = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is LLMProvider =>
      ["openai", "openrouter", "anthropic"].includes(s)
    );

  // Filter to only providers that have an API key present
  return all.filter((p) => {
    switch (p) {
      case "openai":
        return !!process.env.OPENAI_API_KEY;
      case "openrouter":
        return !!process.env.OPENROUTER_API_KEY;
      case "anthropic":
        return !!process.env.ANTHROPIC_API_KEY;
      default:
        return false;
    }
  });
}

/**
 * Build an ArticleLLM handle for a specific provider.
 * Returns `null` if the required API key is missing.
 */
function buildProviderLLM(provider: LLMProvider): ArticleLLM | null {
  switch (provider) {
    case "openrouter": {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return null;
      return {
        kind: "openai-compatible",
        client: new OpenAI({
          apiKey: key,
          baseURL: "https://openrouter.ai/api/v1",
        }),
        model: process.env.OPENROUTER_MODEL || AI_MODELS.TEXT_MODEL,
        supportsJsonMode: false,
        provider: "openrouter",
      };
    }

    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;
      return {
        kind: "openai-compatible",
        client: new OpenAI({ apiKey: key }),
        model: process.env.OPENAI_ARTICLE_MODEL ?? "gpt-4o-mini",
        supportsJsonMode: true,
        provider: "openai",
      };
    }

    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      return {
        kind: "anthropic",
        client: new Anthropic({ apiKey: key }),
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
        supportsJsonMode: false,
        provider: "anthropic",
      };
    }

    default:
      return null;
  }
}

/**
 * Returns the highest-priority LLM provider that has a valid API key.
 * Priority is controlled by the `LLM_PROVIDER_PRIORITY` env var.
 *
 * Example env: `LLM_PROVIDER_PRIORITY=anthropic,openai,openrouter`
 *   → tries Anthropic first, then OpenAI, then OpenRouter.
 *
 * For backward compatibility, also exports a `client` and `model` shape.
 */
export function getArticleLLM(): ArticleLLM {
  const providers = getProviderPriority();
  for (const p of providers) {
    const llm = buildProviderLLM(p);
    if (llm) return llm;
  }

  // Ultimate fallback: OpenAI with whatever key is present (may be empty)
  return {
    kind: "openai-compatible",
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }),
    model: process.env.OPENAI_ARTICLE_MODEL ?? "gpt-4o-mini",
    supportsJsonMode: true,
    provider: "openai",
  };
}

/**
 * Returns ALL configured providers in priority order.
 * Useful for implementing fallback chains where callers want to try
 * the next provider when the primary one fails.
 */
export function getAllConfiguredProviders(): ArticleLLM[] {
  const providers = getProviderPriority();
  return providers
    .map((p) => buildProviderLLM(p))
    .filter((llm): llm is ArticleLLM => llm !== null);
}

// ==========================================
// UNIFIED CHAT COMPLETION
// ==========================================

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Unified chat completion that works with any provider (OpenAI-compatible or Anthropic native).
 * Handles the API differences transparently. Supports automatic fallback
 * to the next provider on failure.
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<{ content: string; model: string; provider: LLMProvider }> {
  const providers = getAllConfiguredProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM providers configured. Set at least one of: OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY"
    );
  }

  let lastError: Error | null = null;

  for (const llm of providers) {
    try {
      const result = await callProvider(llm, options);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[LLM] Provider "${llm.provider}" failed: ${lastError.message}. Trying next...`
      );
    }
  }

  throw lastError ?? new Error("All LLM providers failed");
}

/**
 * Execute a chat completion against a specific provider.
 */
async function callProvider(
  llm: ArticleLLM,
  options: ChatCompletionOptions
): Promise<{ content: string; model: string; provider: LLMProvider }> {
  const model = options.model ?? llm.model;

  if (llm.kind === "anthropic") {
    // Native Anthropic Messages API
    const systemMsg = options.messages.find((m) => m.role === "system");
    const nonSystemMessages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await llm.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: nonSystemMessages,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return {
      content: textBlock?.text ?? "",
      model,
      provider: "anthropic",
    };
  }

  // OpenAI-compatible path (OpenAI, OpenRouter)
  const completion = await llm.client.chat.completions.create({
    model,
    messages: options.messages,
    ...(options.jsonMode && llm.supportsJsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
  });

  return {
    content: completion.choices[0]?.message?.content ?? "",
    model,
    provider: llm.provider,
  };
}

// ==========================================
// IMAGE GENERATION (unchanged — uses OpenRouter)
// ==========================================

/** Context passed to the image generator for richer, article-relevant images. */
export type ImageContext = {
  headline: string;
  subheadline?: string | null;
  bodyExcerpt?: string;
  category?: string;
};

/**
 * Builds a rich, context-aware image prompt from article data.
 * The goal is to produce an image that is immediately recognisable as
 * belonging to *this specific article*, not just a generic newspaper graphic.
 */
function buildImagePrompt(ctx: ImageContext): string {
  const categoryHints: Record<string, string> = {
    politics: "government buildings, politicians at podiums, congressional halls, ballot boxes, political rallies",
    economy: "stock tickers, Wall Street, currency notes, trading floors, financial charts, gold bars",
    crypto: "blockchain networks, digital coins, futuristic circuits, crypto exchange screens, Bitcoin symbols",
    sports: "athletes in action, stadiums, crowds cheering, sports equipment, trophies, scoreboards",
    science: "laboratories, scientists, space imagery, microscopes, DNA helices, telescopes",
    entertainment: "movie cameras, red carpets, stage lights, concert halls, award ceremonies",
    world: "globe, world maps, international landmarks, flags, diplomats shaking hands",
  };

  const visualHint = ctx.category ? categoryHints[ctx.category] ?? "" : "";

  // Take the first ~80 words of the body to give the model concrete story details
  const bodySnippet = ctx.bodyExcerpt
    ? ctx.bodyExcerpt.split(/\s+/).slice(0, 80).join(" ")
    : "";

  return [
    `Create a dramatic, cinematic editorial photograph for a premium newspaper article.`,
    ``,
    `HEADLINE: "${ctx.headline}"`,
    ctx.subheadline ? `SUBHEADLINE: "${ctx.subheadline}"` : "",
    bodySnippet ? `STORY CONTEXT: ${bodySnippet}` : "",
    ``,
    `VISUAL DIRECTION:`,
    `- The image must directly depict the specific subject matter of this headline — show the actual people, places, or objects referenced.`,
    visualHint ? `- Include visual elements such as: ${visualHint}.` : "",
    `- Style: vintage 1930s broadsheet newspaper editorial illustration or high-contrast black-and-white photograph.`,
    `- Mood: dramatic lighting, strong shadows, photojournalistic composition.`,
    `- NO text, NO watermarks, NO logos, NO captions within the image.`,
    `- Aspect ratio: landscape (16:9).`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generates an image for an article. Uses the configured IMAGE_MODEL from OpenRouter.
 * Accepts rich article context so the generated image is visually tied to the story.
 */
export async function generateArticleImage(
  ctx: ImageContext,
  marketId: string
): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  try {
    // Kite AI: Autonomous Agent Payment (Editor pays Photographer via KITE test token)
    // This is an x402-style micro-payment
    await authorizeX402PaymentForImage(ctx.headline);

    const styledPrompt = buildImagePrompt(ctx);

    if (openRouterKey) {
      // Use OpenRouter Image API
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: AI_MODELS.IMAGE_MODEL,
          messages: [{ role: "user", content: styledPrompt }]
        })
      });

      const d = await res.json();

      // OpenRouter image models return the base64 URL in a few possible nested locations depending on the provider
      let b64 = d.choices?.[0]?.message?.content;

      // If it's empty in content, try checking if it's placed inside a nested images array:
      if (!b64 || !b64.startsWith("data:image")) {
        // Attempt to extract from various possible nesting paths that providers might use
        b64 = d.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
          d.choices?.[0]?.images?.[0]?.image_url?.url ||
          d.images?.[0]?.image_url?.url ||
          b64;
      }

      if (b64 && (b64.startsWith("data:image") || b64.startsWith("http"))) {
        // Return the data URI or image URL directly to support Vercel Serverless (no local fs writes)
        return b64;
      } else {
        console.warn("Could not find image payload in OpenRouter response. Falling back to free Pollinations API.");
      }
    }

    // Fallback: Pollinations AI — free, no-auth image generation with the same rich prompt
    const pollinationsPrompt = encodeURIComponent(buildImagePrompt(ctx));
    const url = `https://image.pollinations.ai/prompt/${pollinationsPrompt}?width=800&height=500&nologo=true`;

    return url;
  } catch (e) {
    console.error("Image gen error", e);
  }
  return null;
}
