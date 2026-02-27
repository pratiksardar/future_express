/**
 * Future Express — Ingestion Worker
 *
 * This worker pulls data from prediction markets (Polymarket, Kalshi)
 * on a regular interval and updates the database.
 * Independent from the Next.js app to ensure reliability and bypass execution limits.
 *
 * Run: npx tsx services/ingestion-worker/index.ts
 */
import { runIngestion } from "@/lib/ingestion/run";
import { logger } from "@/lib/logger";

const INGESTION_INTERVAL_MS = Number(process.env.INGESTION_INTERVAL_MIN ?? 5) * 60 * 1000;

async function performIngestion() {
    const correlationId = crypto.randomUUID();
    const start = Date.now();

    logger.info({ correlationId }, "Starting scheduled ingestion");

    try {
        const result = await runIngestion();
        const duration = Date.now() - start;

        logger.info({
            correlationId,
            durationMs: duration,
            polymarket: result.polymarketCount,
            kalshi: result.kalshiCount,
            merged: result.mergedCount,
            snapshots: result.snapshotCount
        }, "Ingestion completed successfully");
    } catch (err) {
        logger.error({ correlationId, err }, "Ingestion failed");
    }
}

// ── Main Loop ──
async function main() {
    logger.info({ intervalMin: process.env.INGESTION_INTERVAL_MIN ?? 5 }, "Future Express Ingestion Worker started");

    // Run once on startup
    await performIngestion();

    // Schedule the loop
    setInterval(async () => {
        await performIngestion();
    }, INGESTION_INTERVAL_MS);
}

// Handle termination
process.on("SIGINT", () => {
    logger.info("Ingestion worker shutting down...");
    process.exit(0);
});

main().catch(err => {
    logger.error({ err }, "Fatal error in ingestion worker");
    process.exit(1);
});
