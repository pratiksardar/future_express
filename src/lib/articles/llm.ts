import OpenAI from "openai";
import fs from "fs";
import path from "path";
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

/**
 * Returns an OpenAI-compatible client for article generation.
 * When OPENROUTER_API_KEY is set, uses OpenRouter (e.g. TEXT_MODEL).
 * Otherwise uses OpenAI.
 */
export function getArticleLLM(): {
  client: OpenAI;
  model: string;
  supportsJsonMode: boolean;
} {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || AI_MODELS.TEXT_MODEL;

  if (openRouterKey) {
    return {
      client: new OpenAI({
        apiKey: openRouterKey,
        baseURL: "https://openrouter.ai/api/v1",
      }),
      model: openRouterModel,
      supportsJsonMode: false,
    };
  }

  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" }),
    model: process.env.OPENAI_ARTICLE_MODEL ?? "gpt-4o-mini",
    supportsJsonMode: true,
  };
}

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
