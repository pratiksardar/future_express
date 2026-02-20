/** Number of top trending (by volume) markets to generate articles for in the newspaper feed. */
export const TOP_TRENDING_ARTICLE_COUNT = 15;

import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { searchWeb } from "./research";
import { buildArticlePrompt } from "./prompts";
import { getArticleLLM, generateArticleImage } from "./llm";

/** Extract JSON from model output (handles optional markdown code blocks). */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) return jsonBlock[1].trim();

  // fallback: find first { and last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Short crisp articles: 120–280 words. */
function qualityGate(
  headline: string,
  body: string,
  minWords = 30,
  maxWords = 600
): { pass: boolean; reason?: string } {
  const wordCount = body.trim().split(/\s+/).length;
  if (wordCount < minWords) return { pass: false, reason: `Body too short (${wordCount} words)` };
  if (wordCount > maxWords) return { pass: false, reason: `Body too long (${wordCount} words)` };
  if (headline.length < 5) return { pass: false, reason: "Headline too short" };
  if (headline.length > 200) return { pass: false, reason: "Headline too long" };
  return { pass: true };
}

export type GenerateArticleOptions = {
  editionId?: string;
  editionType?: "morning" | "evening" | "breaking" | "edition_4h";
  slugSuffix?: string;
  newsAngle?: string;
  requiresImage?: boolean;
};

export async function generateArticleForMarket(
  marketId: string,
  options: GenerateArticleOptions = {}
): Promise<{
  success: boolean;
  articleId?: string;
  error?: string;
}> {
  const { editionId, editionType = "morning", slugSuffix, newsAngle, requiresImage } = options;
  const [market] = await db.select().from(markets).where(eq(markets.id, marketId));
  if (!market) return { success: false, error: "Market not found" };

  const researchResults = await searchWeb(market.title, 3);
  const researchContext = researchResults
    .map((r) => `[${r.title}] ${r.snippet.slice(0, 300)}`)
    .join("\n\n");

  const prompt = buildArticlePrompt(market, researchContext, newsAngle);
  const { client, model, supportsJsonMode } = getArticleLLM();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      ...(supportsJsonMode && { response_format: { type: "json_object" } as const }),
      temperature: 0.6,
    });
    let raw = completion.choices[0]?.message?.content ?? "{}";
    if (!supportsJsonMode) raw = extractJson(raw);
    let parsed: { headline?: string; subheadline?: string; body?: string; contrarianTake?: string };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return { success: false, error: "Invalid JSON from model" };
    }

    const headline = String(parsed.headline ?? "").trim() || market.title;
    const body = String(parsed.body ?? "").trim();
    const gate = qualityGate(headline, body);
    if (!gate.pass) return { success: false, error: gate.reason };

    const baseSlug = slugify(headline);
    const slugBase = slugSuffix ? `${baseSlug}-${slugSuffix}` : baseSlug;
    let slug = slugBase;
    let attempt = 0;
    while (true) {
      const existing = await db.select().from(articles).where(eq(articles.slug, slug));
      if (existing.length === 0) break;
      attempt++;
      slug = `${slugBase}-${attempt}`;
    }

    let imageUrl = null;
    if (requiresImage) {
      imageUrl = await generateArticleImage(headline, market.id);
    }

    const [inserted] = await db
      .insert(articles)
      .values({
        marketId: market.id,
        edition: editionType,
        headline,
        subheadline: (parsed.subheadline ?? "").slice(0, 1024) || null,
        body,
        contrarianTake: (parsed.contrarianTake ?? "").slice(0, 1000) || null,
        category: market.category,
        slug,
        imageUrl,
        probabilityAtPublish: market.currentProbability,
        sources: researchResults.length ? researchResults.map((r) => ({ title: r.title, url: r.url })) : null,
        llmModel: completion.model,
        publishedAt: new Date(),
      })
      .returning({ id: articles.id });

    if (editionId && inserted?.id) {
      const maxPos = await db
        .select({ pos: editionArticles.position })
        .from(editionArticles)
        .where(eq(editionArticles.editionId, editionId))
        .orderBy(desc(editionArticles.position))
        .limit(1);
      const nextPos = (maxPos[0]?.pos ?? 0) + 1;
      await db.insert(editionArticles).values({
        editionId,
        articleId: inserted.id,
        position: nextPos,
      });
    }

    return { success: true, articleId: inserted?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return { success: false, error: message };
  }
}

import { buildEditorPersonaPrompt } from "./prompts";

/** Creates a new edition and generates short articles for top markets by volume. Runs every 4h. */
export async function runEditionPipeline(limit = 30): Promise<{
  editionId: string;
  volumeNumber: number | null;
  generated: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hourSlot = Math.floor(now.getUTCHours() / 4) * 4;
  const slugSuffix = `${dateStr}-${String(hourSlot).padStart(2, "0")}`;

  const existing = await db.select({ v: editions.volumeNumber }).from(editions);
  const nextVolume =
    existing.length === 0 ? 1 : (Math.max(...existing.map((r) => r.v ?? 0)) as number) + 1;

  const [edition] = await db
    .insert(editions)
    .values({
      type: "edition_4h",
      date: dateStr,
      volumeNumber: nextVolume,
      publishedAt: now,
    })
    .returning({ id: editions.id, volumeNumber: editions.volumeNumber });

  const editionId = edition?.id ?? "";
  if (!editionId)
    return { editionId: "", volumeNumber: null, generated: 0, failed: 0, errors: ["Failed to create edition"] };

  const topMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.status, "active"))
    .orderBy(desc(markets.volume24h))
    .limit(TOP_TRENDING_ARTICLE_COUNT); // Limit to the exact number of articles we will create

  const errors: string[] = [];
  let generated = 0;
  let failed = 0;

  // Ask the Editor-in-Chief for layout and assignments
  const { client, model, supportsJsonMode } = getArticleLLM();
  let layoutDecisions: { marketId: string; position: number; requiresImage?: boolean; newsAngle?: string }[] = [];
  try {
    const editorPrompt = buildEditorPersonaPrompt(topMarkets);
    const editorCompletion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: editorPrompt }],
      ...(supportsJsonMode && { response_format: { type: "json_object" } as const }),
      temperature: 0.7,
    });

    let raw = editorCompletion.choices[0]?.message?.content ?? "{}";
    if (!supportsJsonMode) raw = extractJson(raw);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.layout)) {
        layoutDecisions = parsed.layout;
      }
    } catch {
      console.warn("Could not parse layout from LLM: ", raw);
    }
  } catch (e) {
    console.error("Failed to generate editor persona layout", e);
  }

  // Iterate based on the layout if possible, otherwise fallback to topMarkets order
  const orderedMarkets = layoutDecisions.length > 0
    ? layoutDecisions.map(d => ({ market: topMarkets.find(m => m.id === d.marketId), decision: d })).filter(x => x.market)
    : topMarkets.map((m, i) => ({ market: m, decision: { marketId: m.id, position: i + 1, requiresImage: i < 5, newsAngle: "" } }));

  for (const { market, decision } of orderedMarkets) {
    if (!market) continue;
    const result = await generateArticleForMarket(market.id, {
      editionId,
      editionType: "edition_4h",
      slugSuffix,
      newsAngle: decision.newsAngle,
      requiresImage: decision.requiresImage,
    });

    // Update position in the edition layout based on editor's call
    if (result.success && result.articleId) {
      await db.update(editionArticles)
        .set({ position: decision.position })
        .where(eq(editionArticles.articleId, result.articleId));
      generated++;
    } else {
      failed++;
      if (result.error) errors.push(`${market.title}: ${result.error}`);
    }
  }

  return { editionId, volumeNumber: edition?.volumeNumber ?? nextVolume, generated, failed, errors };
}

/**
 * Generates short news articles for the top N trending Polymarket markets (by 24h volume)
 * that don't already have an article. Used to fill the newspaper feed.
 * N = TOP_TRENDING_ARTICLE_COUNT (default 15).
 */
export async function generateMorningEdition(limit = 50): Promise<{
  generated: number;
  failed: number;
  errors: string[];
  totalTrending: number;
}> {
  const topMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.status, "active"))
    .orderBy(desc(markets.volume24h))
    .limit(limit);

  const existingArticleMarketIds = new Set(
    (await db.select({ marketId: articles.marketId }).from(articles)).map((r) => r.marketId)
  );

  const toGenerate = topMarkets
    .filter((m) => !existingArticleMarketIds.has(m.id))
    .slice(0, TOP_TRENDING_ARTICLE_COUNT);

  const errors: string[] = [];
  let generated = 0;
  let failed = 0;

  for (const market of toGenerate) {
    const result = await generateArticleForMarket(market.id);
    if (result.success) generated++;
    else {
      failed++;
      if (result.error) errors.push(`${market.title}: ${result.error}`);
    }
  }

  return {
    generated,
    failed,
    errors,
    totalTrending: topMarkets.length,
  };
}
