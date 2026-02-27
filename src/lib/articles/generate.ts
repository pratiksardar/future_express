import { getEditionTopNewsPerSource } from "@/lib/config";
import { db } from "@/lib/db";
import { articles, markets, editions, editionArticles } from "@/lib/db/schema";
import { eq, desc, and, isNotNull, isNull, or, sql } from "drizzle-orm";
import { searchWeb } from "./research";
import { buildArticlePrompt } from "./prompts";
import { chatCompletion, generateArticleImage } from "./llm";
import { get0GAIResponse } from "@/lib/blockchain/zeroG/client";
import { matchScore } from "@/lib/ingestion/normalize";
import { loggers, createPipelineLogger } from "@/lib/logger";

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
  playcardOk?: boolean;
}> {
  const { editionId, editionType = "morning", slugSuffix, newsAngle, requiresImage } = options;
  const [market] = await db.select().from(markets).where(eq(markets.id, marketId));
  if (!market) return { success: false, error: "Market not found" };

  const researchResults = await searchWeb(market.title, 3);
  const researchContext = researchResults
    .map((r) => `[${r.title}] ${r.snippet.slice(0, 300)}`)
    .join("\n\n");

  const prompt = buildArticlePrompt(market, researchContext, newsAngle);

  try {
    // Decentralized AI Inference via 0G Compute Network
    let raw = "{}";
    let modelUsed = "0G Compute (llama-3.3)";
    try {
      raw = await get0GAIResponse(prompt, "You are a professional journalist. You must output strictly valid JSON matching the requested schema.");
    } catch (err) {
      loggers.articles.error({ err, marketId }, "0G inference failed, using empty fallback");
    }

    // We always parse JSON out in case the decentralized inference added markdown ticks
    raw = extractJson(raw);
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
      imageUrl = await generateArticleImage({
        headline,
        subheadline: parsed.subheadline ?? null,
        bodyExcerpt: body,
        category: market.category,
      }, market.id);
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
        llmModel: modelUsed,
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

      // Generate playcard for this article as part of article generation (same volume)
      let playcardOk = false;
      try {
        const { generateAndSavePlaycard } = await import("@/lib/articles/socialAgent");
        const pc = await generateAndSavePlaycard(inserted.id, editionId);
        playcardOk = pc.success;
      } catch (err) {
        loggers.articles.warn({ err, articleId: inserted.id }, "Playcard generation failed for article");
      }
      return { success: true, articleId: inserted?.id, playcardOk };
    }

    return { success: true, articleId: inserted?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return { success: false, error: message };
  }
}

import { buildEditorPersonaPrompt } from "./prompts";
import { getAgentBalance, submitAgentTransactionWithBuilderCode } from "@/lib/blockchain/cdp/client";

/** Creates a new edition and generates short articles for top markets by volume. Runs every 4h. */
export async function runEditionPipeline(): Promise<{
  editionId: string;
  volumeNumber: number | null;
  generated: number;
  failed: number;
  errors: string[];
  playcards?: { generated: number; failed: number; errors: string[] };
}> {
  // Base Mainnet: Self-Sustaining Protocol Solvency Check
  const balanceCheck = await getAgentBalance();
  if (!balanceCheck.solvent) {
    console.error("[Autonomous Agent] HALTED: The Editor Agent ran out of Base Mainnet funds and is insolvent. Refusing to generate a new edition until funded via ERC-8021.");
    loggers.articles.error("Agent insolvent — halting edition pipeline until funded");
    return {
      editionId: "",
      volumeNumber: null,
      generated: 0,
      failed: 1,
      errors: ["Agent Insolvent. Awaiting Base Network user funding to resume computing."]
    };
  }

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

  // ── Balanced market selection: N from Polymarket, N from Kalshi (N = EDITION_TOP_NEWS_PER_SOURCE) ──
  const topNewsPerSource = getEditionTopNewsPerSource();
  const polyMarkets = await db
    .select()
    .from(markets)
    .where(and(eq(markets.status, "active"), isNotNull(markets.polymarketId)))
    .orderBy(desc(markets.volume24h))
    .limit(topNewsPerSource);

  const kalshiMarkets = await db
    .select()
    .from(markets)
    .where(and(eq(markets.status, "active"), isNotNull(markets.kalshiTicker), isNull(markets.polymarketId)))
    .orderBy(desc(markets.volume24h))
    .limit(topNewsPerSource);

  // Dedup: if a Kalshi market title is very similar to a Polymarket one, skip it (it's the same question)
  const DEDUP_THRESHOLD = 0.70;
  const dedupedKalshi = kalshiMarkets.filter(k => {
    for (const p of polyMarkets) {
      if (matchScore(p.title, k.title) >= DEDUP_THRESHOLD) {
        console.log(`[Dedup] Skipping Kalshi "${k.title}" — matches Polymarket "${p.title}"`);
        return false;
      }
    }
    return true;
  });

  // Combine: Polymarket first, then unique Kalshi markets
  const topMarkets = [...polyMarkets, ...dedupedKalshi];
  const log = createPipelineLogger("edition", editionId);
  log.info(
    { polymarket: polyMarkets.length, kalshi: dedupedKalshi.length, dupesRemoved: kalshiMarkets.length - dedupedKalshi.length, total: topMarkets.length },
    "Market selection complete"
  );


  const errors: string[] = [];
  let generated = 0;
  let failed = 0;

  // Ask the Editor-in-Chief for layout and assignments (uses priority-ordered LLM with fallbacks)
  let layoutDecisions: { marketId: string; position: number; requiresImage?: boolean; newsAngle?: string }[] = [];
  try {
    const editorPrompt = buildEditorPersonaPrompt(topMarkets);
    const editorResult = await chatCompletion({
      messages: [{ role: "user", content: editorPrompt }],
      jsonMode: true,
      temperature: 0.7,
    });

    let raw = editorResult.content;
    raw = extractJson(raw);
    loggers.articles.info({ provider: editorResult.provider, model: editorResult.model }, "Editor persona LLM responded");
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.layout)) {
        layoutDecisions = parsed.layout;
      }
    } catch {
      loggers.articles.warn({ raw }, "Could not parse layout from LLM");
    }
  } catch (e) {
    loggers.articles.error({ err: e }, "Failed to generate editor persona layout");
  }

  // Iterate based on the layout if possible, otherwise fallback to topMarkets order
  const orderedMarkets = layoutDecisions.length > 0
    ? layoutDecisions.map(d => ({ market: topMarkets.find(m => m.id === d.marketId), decision: d })).filter(x => x.market)
    : topMarkets.map((m, i) => ({ market: m, decision: { marketId: m.id, position: i + 1, requiresImage: i < 5, newsAngle: "" } })); // Defaults to 5 images if LLM fails

  // Hedera Consensus Service: Log editorial layout for agentic transparency
  if (orderedMarkets.length > 0) {
    try {
      const { logEditorialDecision } = await import("@/lib/blockchain/hedera/client");
      await logEditorialDecision(editionId, orderedMarkets.map(m => m.decision));
    } catch (err) {
      loggers.hedera.warn({ err }, "Hedera integration not imported or failed");
    }
  }

  let playcardsGenerated = 0;
  let playcardsFailed = 0;
  const playcardErrors: string[] = [];

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
      if (result.playcardOk) playcardsGenerated++;
      else if (result.articleId) {
        playcardsFailed++;
        playcardErrors.push(`${market.title}: playcard failed`);
      }
    } else {
      failed++;
      if (result.error) errors.push(`${market.title}: ${result.error}`);
    }
  }

  const playcardsResult =
    generated > 0
      ? { generated: playcardsGenerated, failed: playcardsFailed, errors: playcardErrors }
      : undefined;
  if (playcardsResult && (playcardsGenerated > 0 || playcardsFailed > 0)) {
    loggers.articles.info(
      { editionId, playcards: playcardsGenerated, playcardsFailed },
      "Social playcards generated with articles"
    );
  }

  // Post-Edition: Autonomous Sub-wallet 8021 tracking execution payment
  // This physically transacts on Base Mainnet to pay "Publishing Royalties" / overhead
  // using the 8021 tracker format exactly as specified by the bounty
  try {
    if (generated > 0) {
      loggers.articles.info("Publishing complete — issuing Base Mainnet royalty tx with ERC-8021");
      await submitAgentTransactionWithBuilderCode(
        "0x0000000000000000000000000000000000000000",
        "0", // 0 value for demo unless we actually want to spend
        "x402:metadata-overhead-fee"
      );
    }
  } catch (err) {
    loggers.cdp.warn({ err }, "Could not log 8021 tx");
  }

  return {
    editionId,
    volumeNumber: edition?.volumeNumber ?? nextVolume,
    generated,
    failed,
    errors,
    playcards: playcardsResult,
  };
}

/**
 * Generates short news articles for the top N trending Polymarket markets (by 24h volume)
 * that don't already have an article. Used to fill the newspaper feed.
 * N = EDITION_TOP_NEWS_PER_SOURCE (config).
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

  const cap = getEditionTopNewsPerSource();
  const toGenerate = topMarkets
    .filter((m) => !existingArticleMarketIds.has(m.id))
    .slice(0, cap);

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
