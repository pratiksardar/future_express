import { inngest } from "./client";
import { runIngestion } from "@/lib/ingestion/run";
import { generateMorningEdition, runEditionPipeline } from "@/lib/articles/generate";
import { db } from "@/lib/db";
import { articles, probabilitySnapshots } from "@/lib/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { broadcastBreaking } from "@/app/api/events/breaking/route";
import { isAlertSuppressed, recordAlert, type BreakingAlert } from "@/lib/breaking/store";
import {
  buildDigestContent,
  findSubscribersDueNow,
  sendDigestToSubscriber,
} from "@/lib/email/send";
import { sendBreakingPush, sendEditionPush } from "@/lib/push/send";

/**
 * Primary pipeline: every 4 hours we pull data from prediction markets once,
 * save markets to the DB, create a new edition (volume), and generate articles
 * for the top 10–15 trending. The newspaper feed shows these articles; no need
 * to fetch from Polymarket/Kalshi again until the next run.
 */
export const editionEvery4h = inngest.createFunction(
  { id: "edition-every-4h", name: "New edition every 4 hours (data refresh + articles)" },
  { cron: "0 */4 * * *" },
  async () => {
    const ingest = await runIngestion();
    const edition = await runEditionPipeline();

    // Push fan-out: every-4h edition publish notifies subscribers with the
    // 'edition' topic. No-op if VAPID is unset.
    try {
      if (edition?.editionId) {
        await sendEditionPush({
          title: `New edition · Vol. ${edition.volumeNumber ?? "?"}`,
          body: `${edition.generated} new stories from Polymarket and Kalshi.`,
          url: edition.volumeNumber ? `/edition/${edition.volumeNumber}` : "/",
          tag: `fe-edition-${edition.editionId}`,
        });
      }
    } catch (err) {
      console.warn("[editionEvery4h] sendEditionPush failed:", err);
    }

    return { ingest, edition };
  }
);

/** Optional: refresh market data every 5 min for live ticker/odds. Disable if you only want 4h fetches. */
export const fetchMarkets = inngest.createFunction(
  { id: "fetch-markets", name: "Fetch Polymarket & Kalshi markets" },
  { cron: "*/5 * * * *" },
  async () => {
    const result = await runIngestion();
    return result;
  }
);

export const morningEdition = inngest.createFunction(
  { id: "morning-edition", name: "Generate Morning Edition articles" },
  { cron: "0 12 * * *" },
  async () => {
    const result = await generateMorningEdition();
    return result;
  }
);

export const checkBreaking = inngest.createFunction(
  { id: "check-breaking", name: "Check for breaking probability shifts" },
  { cron: "*/15 * * * *" },
  async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db
      .select({
        marketId: probabilitySnapshots.marketId,
        probability: probabilitySnapshots.probability,
        recordedAt: probabilitySnapshots.recordedAt,
      })
      .from(probabilitySnapshots)
      .where(gte(probabilitySnapshots.recordedAt, oneHourAgo))
      .orderBy(desc(probabilitySnapshots.recordedAt));

    const byMarket = new Map<string, { min: number; max: number }>();
    for (const r of recent) {
      const p = Number(r.probability);
      const cur = byMarket.get(r.marketId) ?? { min: p, max: p };
      cur.min = Math.min(cur.min, p);
      cur.max = Math.max(cur.max, p);
      byMarket.set(r.marketId, cur);
    }

    const breaking: string[] = [];
    for (const [marketId, { min, max }] of byMarket) {
      if (max - min >= 15) breaking.push(marketId);
    }

    // For each breaking market, find the most recent article and broadcast it.
    for (const marketId of breaking.slice(0, 10)) {
      const [article] = await db
        .select({
          id: articles.id,
          headline: articles.headline,
          slug: articles.slug,
          probabilityAtPublish: articles.probabilityAtPublish,
        })
        .from(articles)
        .where(eq(articles.marketId, marketId))
        .orderBy(desc(articles.publishedAt))
        .limit(1);

      if (article && article.slug) {
        broadcastBreaking({
          articleId: article.id,
          headline: article.headline,
          slug: article.slug,
          probability: Number(article.probabilityAtPublish ?? 0) / 100,
        });
      }
    }

    return { breakingCount: breaking.length, marketIds: breaking.slice(0, 10) };
  }
);

/**
 * Detect markets whose probability has moved >10pts (absolute) in the last 24h,
 * and persist them as Redis-backed alerts. Runs every 5 minutes.
 *
 * Why a separate function from `checkBreaking`?
 * - `checkBreaking` is real-time SSE fan-out (1h window, 15pt threshold) — no
 *   persistence, no de-dup. Its alerts vanish on disconnect.
 * - `detectBreaking` is the durable banner pipeline. It writes to Redis with a
 *   6h suppression so we don't spam the same market repeatedly, and it's read
 *   back by `/api/breaking/recent` (HTTP-poll friendly, edge-cacheable).
 *
 * The two coexist; SSE for connected clients, polling-via-Redis for everyone
 * else (including new arrivals after the spike).
 */
export const detectBreaking = inngest.createFunction(
  { id: "detect-breaking", name: "Detect 24h probability shifts and queue alerts" },
  { cron: "*/5 * * * *" },
  async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        marketId: probabilitySnapshots.marketId,
        probability: probabilitySnapshots.probability,
        recordedAt: probabilitySnapshots.recordedAt,
      })
      .from(probabilitySnapshots)
      .where(gte(probabilitySnapshots.recordedAt, dayAgo))
      .orderBy(probabilitySnapshots.recordedAt);

    // Walk in chronological order so first/last are oldest/newest in the window.
    type MarketAcc = { first: number; last: number };
    const byMarket = new Map<string, MarketAcc>();
    for (const r of rows) {
      const p = Number(r.probability);
      const acc = byMarket.get(r.marketId);
      if (!acc) {
        byMarket.set(r.marketId, { first: p, last: p });
      } else {
        acc.last = p;
      }
    }

    // Probabilities are stored as 0–100 with 2 decimals. >10pt absolute change
    // is the threshold per LAUNCH.md.
    const candidates: Array<{ marketId: string; before: number; now: number; delta: number }> = [];
    for (const [marketId, { first, last }] of byMarket) {
      const delta = last - first;
      if (Math.abs(delta) >= 10) {
        candidates.push({ marketId, before: first, now: last, delta });
      }
    }

    let queued = 0;
    let suppressed = 0;
    const queuedMarketIds: string[] = [];

    for (const c of candidates) {
      // 6h suppression — matches the breaking:{marketId} TTL.
      if (await isAlertSuppressed(c.marketId)) {
        suppressed += 1;
        continue;
      }

      // Resolve the most recent article for this market so the alert links
      // somewhere meaningful. Skip if no article exists yet.
      const [article] = await db
        .select({
          id: articles.id,
          headline: articles.headline,
          slug: articles.slug,
        })
        .from(articles)
        .where(eq(articles.marketId, c.marketId))
        .orderBy(desc(articles.publishedAt))
        .limit(1);

      if (!article || !article.slug) continue;

      const alert: BreakingAlert = {
        marketId: c.marketId,
        articleId: article.id,
        slug: article.slug,
        headline: article.headline,
        probabilityBefore: Math.round(c.before * 100) / 100,
        probabilityNow: Math.round(c.now * 100) / 100,
        delta: Math.round(c.delta * 100) / 100,
        alertedAt: new Date().toISOString(),
      };

      await recordAlert(alert);
      queued += 1;
      queuedMarketIds.push(c.marketId);

      // Also fan out via SSE for connected clients.
      broadcastBreaking({
        articleId: alert.articleId,
        headline: alert.headline,
        slug: alert.slug,
        probability: alert.probabilityNow / 100,
      });

      // Web Push fan-out for subscribers with the 'breaking' topic.
      // No-ops if VAPID keys are unset; never throws past this catch.
      try {
        const direction = alert.delta >= 0 ? "+" : "";
        await sendBreakingPush({
          title: "Breaking: probability shift",
          body: `${alert.headline} now ${alert.probabilityNow}% (${direction}${Math.round(alert.delta)}pts)`,
          url: `/article/${alert.slug}`,
          tag: `fe-breaking-${alert.marketId}`,
        });
      } catch (err) {
        console.warn("[detectBreaking] sendBreakingPush failed:", err);
      }
    }

    return {
      candidates: candidates.length,
      queued,
      suppressed,
      queuedMarketIds,
    };
  }
);

/**
 * Daily digest sender — runs every hour, finds subscribers whose preferred
 * local hour matches the current hour in their timezone, and sends them the
 * latest edition's top stories.
 *
 * Localization: each subscriber stores an IANA timezone string and a preferred
 * hour (default 7 = 7AM local). The hourly cron uses Intl.DateTimeFormat to
 * compute the current hour in their TZ — no timezone library needed.
 *
 * Resilience: if RESEND_API_KEY is unset, individual sends return
 * `skipped_no_provider` (logged once) and the cron exits cleanly. The cron
 * MUST NOT crash on a missing key — that's a documented contract.
 */
export const sendDailyDigest = inngest.createFunction(
  { id: "send-daily-digest", name: "Send localized 7AM daily digest" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "[sendDailyDigest] RESEND_API_KEY not set — skipping digest run"
      );
      return { skipped: true, reason: "no_provider" };
    }

    const dueSubscribers = await step.run("find-due-subscribers", async () =>
      findSubscribersDueNow()
    );

    if (dueSubscribers.length === 0) {
      return { sent: 0, skipped: 0, bounced: 0, errored: 0, total: 0 };
    }

    const content = await step.run("build-digest", async () =>
      buildDigestContent()
    );

    let sent = 0;
    let skipped = 0;
    let bounced = 0;
    let errored = 0;

    // Per-recipient send. We could use Resend's batch endpoint, but per-send
    // gives us per-row bounce handling and `last_sent_at` updates without
    // additional bookkeeping. At free-tier volume this is fine.
    for (const sub of dueSubscribers) {
      const result = await sendDigestToSubscriber(sub.id, content);
      if (result.status === "sent") sent += 1;
      else if (result.status === "bounced") bounced += 1;
      else if (result.status === "skipped_no_provider") skipped += 1;
      else errored += 1;
    }

    return {
      sent,
      skipped,
      bounced,
      errored,
      total: dueSubscribers.length,
    };
  }
);
