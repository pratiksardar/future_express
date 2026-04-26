import { db } from "@/lib/db";
import {
  articles,
  markets,
  marketAccuracy,
  platformAccuracy,
  accuracyReports,
} from "@/lib/db/schema";
import { eq, desc, and, isNotNull, isNull, sql, gte, lte } from "drizzle-orm";
import { chatCompletion } from "./llm";

// ── Brier Score ──

/** Standard Brier score: 0 = perfect, 1 = worst. */
export function computeBrierScore(
  predictedProb: number,
  actualOutcome: boolean
): number {
  const p = predictedProb / 100;
  const o = actualOutcome ? 1 : 0;
  return (p - o) ** 2;
}

/** Convert average Brier score to a 0-100 confidence rating. */
export function computeConfidenceScore(brierScores: number[]): number {
  if (brierScores.length === 0) return 0;
  const avg = brierScores.reduce((s, b) => s + b, 0) / brierScores.length;
  return Math.round((1 - avg) * 100);
}

/** Did the article's implied direction match the outcome? */
function isDirectionCorrect(
  probAtPublish: number,
  resolutionOutcome: string
): boolean {
  const implied = probAtPublish >= 50 ? "yes" : "no";
  return implied === resolutionOutcome.toLowerCase();
}

// ── Score a single article ──

export async function scoreArticleAccuracy(
  articleId: string
): Promise<{ scored: boolean; error?: string }> {
  const rows = await db
    .select({
      articleId: articles.id,
      marketId: articles.marketId,
      probabilityAtPublish: articles.probabilityAtPublish,
      marketStatus: markets.status,
      currentProbability: markets.currentProbability,
      resolutionOutcome: markets.resolutionOutcome,
      resolvedAt: markets.resolvedAt,
    })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  const row = rows[0];
  if (!row) return { scored: false, error: "Article not found" };
  if (!row.probabilityAtPublish)
    return { scored: false, error: "No probability at publish" };

  const pubProb = Number(row.probabilityAtPublish);
  const curProb = Number(row.currentProbability ?? pubProb);
  const delta = curProb - pubProb;

  const isResolved = row.marketStatus === "resolved" && row.resolutionOutcome;

  let brierScore: number | null = null;
  let directionCorrect: number | null = null;
  let status: "tracking" | "resolved" = "tracking";

  if (isResolved && row.resolutionOutcome) {
    const outcome = row.resolutionOutcome.toLowerCase() === "yes";
    brierScore = computeBrierScore(pubProb, outcome);
    directionCorrect = isDirectionCorrect(pubProb, row.resolutionOutcome)
      ? 1
      : 0;
    status = "resolved";
  }

  await db
    .insert(marketAccuracy)
    .values({
      articleId: row.articleId,
      marketId: row.marketId,
      probabilityAtPublish: String(pubProb),
      currentProbability: String(curProb),
      probabilityDelta: String(delta),
      directionCorrect,
      brierScore: brierScore != null ? String(brierScore) : null,
      resolutionOutcome: row.resolutionOutcome,
      status,
      scoredAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketAccuracy.articleId,
      set: {
        currentProbability: String(curProb),
        probabilityDelta: String(delta),
        directionCorrect,
        brierScore: brierScore != null ? String(brierScore) : null,
        resolutionOutcome: row.resolutionOutcome,
        status,
        scoredAt: new Date(),
      },
    });

  return { scored: true };
}

// ── Score all pending articles ──

export async function scoreAllPendingArticles(): Promise<{
  scored: number;
  errors: string[];
}> {
  // Find articles with resolved markets that need scoring
  const pending = await db
    .select({ articleId: articles.id })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .leftJoin(marketAccuracy, eq(articles.id, marketAccuracy.articleId))
    .where(
      and(
        eq(markets.status, "resolved"),
        isNotNull(markets.resolutionOutcome),
        isNotNull(articles.probabilityAtPublish),
        // Either no accuracy record, or still in pending/tracking status
        sql`(${marketAccuracy.id} IS NULL OR ${marketAccuracy.status} IN ('pending', 'tracking'))`
      )
    );

  let scored = 0;
  const errors: string[] = [];

  for (const row of pending) {
    const result = await scoreArticleAccuracy(row.articleId);
    if (result.scored) scored++;
    else if (result.error) errors.push(`${row.articleId}: ${result.error}`);
  }

  // Also update tracking records for active markets (refresh current probability)
  const tracking = await db
    .select({ articleId: articles.id })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .innerJoin(marketAccuracy, eq(articles.id, marketAccuracy.articleId))
    .where(
      and(
        eq(markets.status, "active"),
        eq(marketAccuracy.status, "tracking")
      )
    )
    .limit(100);

  for (const row of tracking) {
    await scoreArticleAccuracy(row.articleId);
  }

  return { scored, errors };
}

// ── Platform-wide accuracy computation ──

export async function computePlatformAccuracyStats(
  period: "daily" | "weekly" | "monthly" | "all_time",
  periodStart?: Date
): Promise<string | null> {
  let dateFilter = sql`TRUE`;
  let pStart: string | null = null;
  let pEnd: string | null = null;

  if (period !== "all_time" && periodStart) {
    const end = new Date(periodStart);
    if (period === "daily") end.setDate(end.getDate() + 1);
    else if (period === "weekly") end.setDate(end.getDate() + 7);
    else if (period === "monthly") end.setMonth(end.getMonth() + 1);

    pStart = periodStart.toISOString().slice(0, 10);
    pEnd = end.toISOString().slice(0, 10);
    dateFilter = and(
      gte(marketAccuracy.scoredAt, periodStart),
      lte(marketAccuracy.scoredAt, end)
    )!;
  }

  const resolved = await db
    .select({
      id: marketAccuracy.id,
      articleId: marketAccuracy.articleId,
      brierScore: marketAccuracy.brierScore,
      directionCorrect: marketAccuracy.directionCorrect,
      category: articles.category,
      headline: articles.headline,
      probabilityAtPublish: marketAccuracy.probabilityAtPublish,
      resolutionOutcome: marketAccuracy.resolutionOutcome,
    })
    .from(marketAccuracy)
    .innerJoin(articles, eq(marketAccuracy.articleId, articles.id))
    .where(and(eq(marketAccuracy.status, "resolved"), dateFilter));

  const totalArticles = resolved.length;
  if (totalArticles === 0) return null;

  const brierScores = resolved
    .filter((r) => r.brierScore != null)
    .map((r) => Number(r.brierScore));

  const correctCount = resolved.filter(
    (r) => r.directionCorrect === 1
  ).length;
  const avgBrier =
    brierScores.length > 0
      ? brierScores.reduce((s, b) => s + b, 0) / brierScores.length
      : null;
  const confidence = brierScores.length > 0
    ? computeConfidenceScore(brierScores)
    : null;

  // Category breakdown
  const cats: Record<
    string,
    { total: number; correct: number; brierSum: number; brierCount: number }
  > = {};
  for (const r of resolved) {
    const cat = r.category ?? "unknown";
    if (!cats[cat]) cats[cat] = { total: 0, correct: 0, brierSum: 0, brierCount: 0 };
    cats[cat].total++;
    if (r.directionCorrect === 1) cats[cat].correct++;
    if (r.brierScore != null) {
      cats[cat].brierSum += Number(r.brierScore);
      cats[cat].brierCount++;
    }
  }
  const categoryBreakdown = Object.fromEntries(
    Object.entries(cats).map(([k, v]) => [
      k,
      {
        total: v.total,
        correct: v.correct,
        accuracyPct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        avgBrier: v.brierCount > 0 ? v.brierSum / v.brierCount : null,
      },
    ])
  );

  // Top hits (lowest Brier) and misses (highest Brier)
  const withBrier = resolved
    .filter((r) => r.brierScore != null)
    .sort((a, b) => Number(a.brierScore) - Number(b.brierScore));
  const topHits = withBrier.slice(0, 5).map((r) => ({
    headline: r.headline,
    probabilityAtPublish: r.probabilityAtPublish,
    resolutionOutcome: r.resolutionOutcome,
    brierScore: r.brierScore,
  }));
  const topMisses = withBrier
    .slice(-5)
    .reverse()
    .map((r) => ({
      headline: r.headline,
      probabilityAtPublish: r.probabilityAtPublish,
      resolutionOutcome: r.resolutionOutcome,
      brierScore: r.brierScore,
    }));

  const [inserted] = await db
    .insert(platformAccuracy)
    .values({
      period,
      periodStart: pStart,
      periodEnd: pEnd,
      totalArticles,
      resolvedArticles: totalArticles,
      correctDirectionCount: correctCount,
      avgBrierScore: avgBrier != null ? String(avgBrier) : null,
      confidenceScore: confidence,
      categoryBreakdown,
      topHits,
      topMisses,
    })
    .returning({ id: platformAccuracy.id });

  return inserted?.id ?? null;
}

// ── AI-generated accuracy report ──

export async function generateAccuracyReport(
  platformAccuracyId: string
): Promise<{ reportId: string | null; error?: string }> {
  const [pa] = await db
    .select()
    .from(platformAccuracy)
    .where(eq(platformAccuracy.id, platformAccuracyId))
    .limit(1);

  if (!pa) return { reportId: null, error: "Platform accuracy record not found" };

  const hits = (pa.topHits as Array<{ headline: string; probabilityAtPublish: string; resolutionOutcome: string; brierScore: string }>) ?? [];
  const misses = (pa.topMisses as Array<{ headline: string; probabilityAtPublish: string; resolutionOutcome: string; brierScore: string }>) ?? [];

  const prompt = `You are the ombudsman of "The Future Express," writing the weekly prediction accuracy report.
Your tone is honest, self-deprecating when wrong, and appropriately proud when right. Write in the style of a 1930s newspaper editorial.

PERIOD: ${pa.periodStart ?? "All time"} to ${pa.periodEnd ?? "Present"}
TOTAL RESOLVED PREDICTIONS: ${pa.resolvedArticles}
CORRECT DIRECTION: ${pa.correctDirectionCount} of ${pa.resolvedArticles} (${pa.resolvedArticles > 0 ? Math.round((pa.correctDirectionCount / pa.resolvedArticles) * 100) : 0}%)
CONFIDENCE SCORE: ${pa.confidenceScore ?? "N/A"}/100
AVG BRIER SCORE: ${pa.avgBrierScore ?? "N/A"}

BEST CALLS:
${hits.map((h) => `- "${h.headline}": Published at ${h.probabilityAtPublish}%, Resolved ${h.resolutionOutcome} (Brier: ${h.brierScore})`).join("\n")}

WORST CALLS:
${misses.map((m) => `- "${m.headline}": Published at ${m.probabilityAtPublish}%, Resolved ${m.resolutionOutcome} (Brier: ${m.brierScore})`).join("\n")}

CATEGORY BREAKDOWN:
${JSON.stringify(pa.categoryBreakdown, null, 2)}

Write a report card. Respond with valid JSON only:
{
  "headline": "Summary headline under 15 words",
  "narrative": "3-4 paragraphs of analysis in retro newspaper style",
  "grade": "A+|A|A-|B+|B|B-|C+|C|C-|D|F",
  "lesson": "One key takeaway sentence",
  "socialSummary": "2 sentences for sharing on social media"
}`;

  try {
    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: 0.7,
    });

    let parsed: {
      headline?: string;
      narrative?: string;
      grade?: string;
      lesson?: string;
      socialSummary?: string;
    };
    try {
      const cleaned = result.content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      parsed = JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return { reportId: null, error: "Failed to parse report JSON" };
    }

    const [inserted] = await db
      .insert(accuracyReports)
      .values({
        platformAccuracyId,
        headline: parsed.headline ?? "Weekly Prediction Report",
        narrative: parsed.narrative ?? "",
        grade: parsed.grade ?? "C",
        lesson: parsed.lesson ?? null,
        socialSummary: parsed.socialSummary ?? null,
      })
      .returning({ id: accuracyReports.id });

    return { reportId: inserted?.id ?? null };
  } catch (e) {
    return {
      reportId: null,
      error: e instanceof Error ? e.message : "LLM call failed",
    };
  }
}

// ── Context for article generation: past accuracy for this market ──

export async function getArticleAccuracyContext(marketId: string) {
  const previous = await db
    .select({
      headline: articles.headline,
      probabilityAtPublish: marketAccuracy.probabilityAtPublish,
      currentProbability: marketAccuracy.currentProbability,
      directionCorrect: marketAccuracy.directionCorrect,
      brierScore: marketAccuracy.brierScore,
      status: marketAccuracy.status,
      publishedAt: articles.publishedAt,
    })
    .from(marketAccuracy)
    .innerJoin(articles, eq(marketAccuracy.articleId, articles.id))
    .where(eq(marketAccuracy.marketId, marketId))
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  if (previous.length === 0) return null;

  return {
    previousArticles: previous,
    trackRecord: previous.filter((p) => p.status === "resolved").length > 0
      ? `${previous.filter((p) => p.directionCorrect === 1).length}/${previous.filter((p) => p.status === "resolved").length} correct`
      : "No resolved predictions yet",
  };
}
