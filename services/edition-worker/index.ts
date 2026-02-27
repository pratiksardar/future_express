/**
 * Future Express — Edition Pipeline Worker
 *
 * This worker runs the full newspaper edition pipeline every 4 hours:
 * 1. Solvency check (CDP Agent balance)
 * 2. Market selection (Top trending)
 * 3. Editor-in-Chief layout (LLM)
 * 4. Article generation (0G / LLM)
 * 5. Media generation (OpenRouter)
 * 6. Consensus logging (Hedera)
 *
 * Independent from Next.js to handle long-running LLM and 0G inference tasks safely.
 *
 * Run: npx tsx services/edition-worker/index.ts
 */
import { runEditionPipeline } from "@/lib/articles/generate";
import { logger } from "@/lib/logger";

// Default: 4 hours
const EDITION_INTERVAL_MS = Number(process.env.EDITION_INTERVAL_HOUR ?? 4) * 60 * 60 * 1000;

async function performEditionPipeline() {
    const correlationId = crypto.randomUUID();
    const start = Date.now();

    logger.info({ correlationId }, "Starting scheduled edition pipeline");

    try {
        const result = await runEditionPipeline();
        const duration = Date.now() - start;

        if (result.editionId) {
            logger.info({
                correlationId,
                durationMs: duration,
                editionId: result.editionId,
                generated: result.generated,
                failed: result.failed
            }, "Edition pipeline completed successfully");
        } else {
            logger.warn({
                correlationId,
                errors: result.errors
            }, "Edition pipeline halted or failed");
        }
    } catch (err) {
        logger.error({ correlationId, err }, "Edition pipeline worker encountered a fatal error");
    }
}

// ── Main Loop ──
async function main() {
    logger.info({ intervalHours: process.env.EDITION_INTERVAL_HOUR ?? 4 }, "Future Express Edition Worker started");

    // Run once on startup
    await performEditionPipeline();

    // Schedule the loop
    setInterval(async () => {
        await performEditionPipeline();
    }, EDITION_INTERVAL_MS);
}

// Handle termination
process.on("SIGINT", () => {
    logger.info("Edition worker shutting down...");
    process.exit(0);
});

main().catch(err => {
    logger.error({ err }, "Fatal error in edition worker");
    process.exit(1);
});
