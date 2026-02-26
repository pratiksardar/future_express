import { inngest } from "./client";
import { runIngestion } from "@/lib/ingestion/run";
import { generateMorningEdition, runEditionPipeline } from "@/lib/articles/generate";
import { db } from "@/lib/db";
import { probabilitySnapshots } from "@/lib/db/schema";
import { desc, gte } from "drizzle-orm";

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
    return { breakingCount: breaking.length, marketIds: breaking.slice(0, 10) };
  }
);
