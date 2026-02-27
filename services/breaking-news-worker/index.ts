/**
 * Future Express — Breaking News Detector Worker
 *
 * This worker monitor probability snapshots for significant shifts (>= 15%)
 * over the last hour. When a shift is detected, it logs the event and
 * could eventually trigger "Breaking News" editions or notifications.
 *
 * Run: npx tsx services/breaking-news-worker/index.ts
 */
import { db } from "@/lib/db";
import { probabilitySnapshots, markets } from "@/lib/db/schema";
import { desc, gte, eq, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

const SHIFT_THRESHOLD = 15; // 15% shift
const DETECTION_INTERVAL_MS = Number(process.env.DETECTION_INTERVAL_MIN ?? 15) * 60 * 1000;

async function checkForBreakingNews() {
    const correlationId = crypto.randomUUID();
    const start = Date.now();

    logger.debug({ correlationId }, "Checking for breaking news shifts");

    try {
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
            if (isNaN(p)) continue;

            const cur = byMarket.get(r.marketId) ?? { min: p, max: p };
            cur.min = Math.min(cur.min, p);
            cur.max = Math.max(cur.max, p);
            byMarket.set(r.marketId, cur);
        }

        const breakingMarketIds: string[] = [];
        for (const [marketId, { min, max }] of byMarket) {
            if (max - min >= SHIFT_THRESHOLD) {
                breakingMarketIds.push(marketId);
            }
        }

        if (breakingMarketIds.length > 0) {
            // Fetch titles for better logging
            const breakingMarkets = await db
                .select({ id: markets.id, title: markets.title })
                .from(markets)
                .where(inArray(markets.id, breakingMarketIds.slice(0, 10)));

            logger.info({
                correlationId,
                breakingCount: breakingMarketIds.length,
                markets: breakingMarkets,
                durationMs: Date.now() - start
            }, "BREAKING NEWS DETECTED: Significant probability shifts found");

            // TODO: In Phase 4/5, trigger a "Breaking News" Push notification or Special Edition
        } else {
            logger.debug({ correlationId, durationMs: Date.now() - start }, "No breaking news detected");
        }
    } catch (err) {
        logger.error({ correlationId, err }, "Breaking news detector failed");
    }
}

// ── Main Loop ──
async function main() {
    logger.info({ intervalMin: process.env.DETECTION_INTERVAL_MIN ?? 15 }, "Future Express Breaking News Detector started");

    // Run once on startup
    await checkForBreakingNews();

    // Schedule the loop
    setInterval(async () => {
        await checkForBreakingNews();
    }, DETECTION_INTERVAL_MS);
}

// Handle termination
process.on("SIGINT", () => {
    logger.info("Breaking news detector shutting down...");
    process.exit(0);
});

main().catch(err => {
    logger.error({ err }, "Fatal error in breaking news detector");
    process.exit(1);
});
