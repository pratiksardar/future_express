/**
 * Prediction-resolution pipeline for the "I Called It" auto-share loop.
 *
 * When a market resolves YES/NO, every user prediction on it is stamped with
 * `was_correct` (true if their `direction` matched the outcome) and a
 * `resolved_at` timestamp. The Inngest hook (see `src/inngest/predictions.ts`)
 * polls for newly-resolved markets and calls this function for each.
 */
import { db } from "@/lib/db";
import { predictions, markets, articles } from "@/lib/db/schema";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { sendPredictionPush } from "@/lib/push/send";

export type ResolveOutcome = "yes" | "no";

export type ResolveResult = {
  resolved: number;
  correct: number;
};

/**
 * Mark all predictions on `marketId` as resolved. A prediction is "correct"
 * when its `direction` matches the final market outcome:
 *   - direction "up"   ↔ outcome "yes"
 *   - direction "down" ↔ outcome "no"
 *
 * Idempotent: predictions already resolved (resolved_at IS NOT NULL) are
 * skipped, so re-running is safe.
 */
export async function resolveUserPredictions(
  marketId: string,
  finalOutcome: ResolveOutcome,
): Promise<ResolveResult> {
  const now = new Date();
  // Direction that "wins" depending on the outcome.
  const winningDirection = finalOutcome === "yes" ? "up" : "down";

  const updated = await db
    .update(predictions)
    .set({
      resolvedAt: now,
      wasCorrect: sql`${predictions.direction} = ${winningDirection}`,
    })
    .where(
      and(eq(predictions.marketId, marketId), isNull(predictions.resolvedAt)),
    )
    .returning({
      id: predictions.id,
      sessionId: predictions.sessionId,
      wasCorrect: predictions.wasCorrect,
    });

  const correct = updated.filter((r) => r.wasCorrect === true).length;

  // Web Push fan-out: every session that had a prediction resolve gets a
  // notification. We fetch the article slug (if any) for a deeplink target.
  // Best-effort — failures are logged and never block resolution.
  if (updated.length > 0) {
    try {
      const [articleRow] = await db
        .select({ slug: articles.slug, headline: articles.headline, marketTitle: markets.title })
        .from(markets)
        .leftJoin(articles, eq(articles.marketId, markets.id))
        .where(eq(markets.id, marketId))
        .orderBy(desc(articles.publishedAt))
        .limit(1);

      const url = articleRow?.slug ? `/article/${articleRow.slug}` : "/";
      const subject = articleRow?.headline ?? articleRow?.marketTitle ?? "Your prediction";

      // De-dup by sessionId — a session might have multiple predictions on
      // the same market (it shouldn't, but the schema unique covers it). One
      // notification per session per resolution.
      const seen = new Set<string>();
      for (const row of updated) {
        if (seen.has(row.sessionId)) continue;
        seen.add(row.sessionId);
        const verb = row.wasCorrect ? "You called it" : "Your prediction resolved";
        const result = row.wasCorrect ? "Correct call." : "Outcome went the other way.";
        await sendPredictionPush(row.sessionId, {
          title: verb,
          body: `${subject} — ${result}`,
          url,
          tag: `fe-prediction-${marketId}`,
        });
      }
    } catch (err) {
      console.warn("[resolveUserPredictions] sendPredictionPush failed:", err);
    }
  }

  return { resolved: updated.length, correct };
}

/**
 * Sweep all markets that have flipped to `resolved` but still have unresolved
 * predictions hanging off them. Runs from the Inngest cron — the trigger
 * "market resolutionOutcome changes from null to a value" is observed via
 * polling rather than DB-level CDC.
 *
 * Returns per-market counts so the cron log can highlight high-impact
 * resolutions (e.g. a market with 50+ correct predictions to celebrate).
 */
export async function sweepResolvedMarkets(): Promise<{
  marketsProcessed: number;
  totalResolved: number;
  totalCorrect: number;
  perMarket: Array<{ marketId: string; resolved: number; correct: number }>;
}> {
  // Markets that are resolved AND have at least one un-resolved user prediction.
  const candidates = await db
    .select({
      marketId: markets.id,
      resolutionOutcome: markets.resolutionOutcome,
    })
    .from(markets)
    .innerJoin(predictions, eq(predictions.marketId, markets.id))
    .where(
      and(
        eq(markets.status, "resolved"),
        isNotNull(markets.resolutionOutcome),
        isNull(predictions.resolvedAt),
      ),
    )
    .groupBy(markets.id, markets.resolutionOutcome);

  const perMarket: Array<{ marketId: string; resolved: number; correct: number }> = [];
  let totalResolved = 0;
  let totalCorrect = 0;

  for (const row of candidates) {
    if (!row.resolutionOutcome) continue;
    const outcome = row.resolutionOutcome.toLowerCase();
    if (outcome !== "yes" && outcome !== "no") continue;
    const result = await resolveUserPredictions(row.marketId, outcome as ResolveOutcome);
    perMarket.push({ marketId: row.marketId, ...result });
    totalResolved += result.resolved;
    totalCorrect += result.correct;
  }

  return {
    marketsProcessed: candidates.length,
    totalResolved,
    totalCorrect,
    perMarket,
  };
}

export type ResolvedCalledItRow = {
  predictionId: string;
  direction: "up" | "down";
  probabilityAtPrediction: number | null;
  predictedAt: Date;
  resolvedAt: Date;
  marketId: string;
  marketTitle: string;
  articleId: string | null;
  articleSlug: string | null;
  articleHeadline: string | null;
};

/**
 * Per-session feed for the homepage banner: correct predictions that have
 * resolved and have NOT been shared yet. Capped at 5; newest first.
 */
export async function getUnsharedCalledItPredictions(
  sessionId: string,
  limit = 5,
): Promise<ResolvedCalledItRow[]> {
  const rows = await db
    .select({
      predictionId: predictions.id,
      direction: predictions.direction,
      probabilityAtPrediction: predictions.probabilityAtPrediction,
      predictedAt: predictions.predictedAt,
      resolvedAt: predictions.resolvedAt,
      marketId: predictions.marketId,
      marketTitle: markets.title,
      articleId: articles.id,
      articleSlug: articles.slug,
      articleHeadline: articles.headline,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.marketId, markets.id))
    .leftJoin(articles, eq(predictions.articleId, articles.id))
    .where(
      and(
        eq(predictions.sessionId, sessionId),
        eq(predictions.wasCorrect, true),
        eq(predictions.iCalledItShared, false),
        isNotNull(predictions.resolvedAt),
      ),
    )
    .orderBy(desc(predictions.resolvedAt))
    .limit(limit);

  return rows.map((r) => ({
    predictionId: r.predictionId,
    direction: r.direction,
    probabilityAtPrediction: r.probabilityAtPrediction != null ? Number(r.probabilityAtPrediction) : null,
    predictedAt: r.predictedAt,
    resolvedAt: r.resolvedAt!,
    marketId: r.marketId,
    marketTitle: r.marketTitle,
    articleId: r.articleId,
    articleSlug: r.articleSlug,
    articleHeadline: r.articleHeadline,
  }));
}
