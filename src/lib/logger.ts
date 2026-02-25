/**
 * Structured logging with pino for Future Express.
 *
 * Usage:
 *   import { logger, createPipelineLogger } from "@/lib/logger";
 *
 *   // Module-level logger (includes module name in every log line)
 *   const log = logger.child({ module: "ingestion" });
 *   log.info({ polymarketCount: 42 }, "Fetched Polymarket events");
 *
 *   // Pipeline-scoped logger (includes editionId / correlation ID)
 *   const plog = createPipelineLogger("edition", editionId);
 *   plog.info({ generated: 5 }, "Articles generated");
 */
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Root logger. In development we use a human-readable format;
 * in production we emit structured JSON for log aggregation.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    ...(!isProduction && {
        transport: {
            target: "pino/file",
            options: { destination: 1 }, // stdout — keeps it simple without pino-pretty
        },
    }),
    formatters: {
        level(label) {
            return { level: label };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger bound to a pipeline run.
 * Every log line will include `pipeline` and `correlationId`.
 *
 * @param pipeline - Name of the pipeline (e.g. "edition", "ingestion", "breaking")
 * @param correlationId - Unique ID for this run (e.g. editionId, or crypto.randomUUID())
 */
export function createPipelineLogger(
    pipeline: string,
    correlationId: string
): pino.Logger {
    return logger.child({ pipeline, correlationId });
}

/**
 * Pre-built module loggers for convenience.
 * Usage: `import { loggers } from "@/lib/logger"; loggers.ingestion.info(...)`
 */
export const loggers = {
    ingestion: logger.child({ module: "ingestion" }),
    articles: logger.child({ module: "articles" }),
    cdp: logger.child({ module: "cdp" }),
    hedera: logger.child({ module: "hedera" }),
    kite: logger.child({ module: "kite" }),
    zeroG: logger.child({ module: "0g" }),
    api: logger.child({ module: "api" }),
    cron: logger.child({ module: "cron" }),
    uniswap: logger.child({ module: "uniswap" }),
    editor: logger.child({ module: "editor-wallet" }),
} as const;
