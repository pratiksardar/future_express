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

/**
 * Generates an image based on the prompt. Uses the configured IMAGE_MODEL from OpenRouter.
 */
export async function generateArticleImage(prompt: string, marketId: string): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  try {
    // Kite AI: Autonomous Agent Payment (Editor pays Photographer via KITE test token)
    // This is an x402-style micro-payment
    await authorizeX402PaymentForImage(prompt);

    const styledPrompt = `A vintage, retro 1930s-style newspaper editorial illustration or black-and-white photo for an article about: ${prompt}. It should look like it belongs in a classic 1930s broadsheet newspaper.`;

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

      if (b64 && b64.startsWith("data:image")) {
        const base64Data = b64.replace(/^data:image\/\w+;base64,/, "");
        const filename = `img-${marketId}-${Date.now()}.jpg`;
        const publicDir = path.join(process.cwd(), "public", "articles");
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        fs.writeFileSync(path.join(publicDir, filename), Buffer.from(base64Data, "base64"));
        return `/articles/${filename}`;
      } else {
        console.warn("Could not find image payload in OpenRouter response. Falling back to free Pollinations API.");
      }
    }

    // Fallback to picsum photos if no key or openrouter failed (pollinations API appears unstable)
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://picsum.photos/seed/${seed}/800/500?grayscale`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to generate fallback image");

    const buffer = await res.arrayBuffer();

    const filename = `img-${marketId}-${Date.now()}.jpg`;
    const publicDir = path.join(process.cwd(), "public", "articles");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    fs.writeFileSync(path.join(publicDir, filename), Buffer.from(buffer));
    return `/articles/${filename}`;
  } catch (e) {
    console.error("Image gen error", e);
  }
  return null;
}
