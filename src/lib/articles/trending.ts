/**
 * Trending indicators: detect which markets have significant probability movement.
 * Used to show "ODDS SHIFTING" badges on article cards.
 */

import { db } from "@/lib/db";
import { probabilitySnapshots } from "@/lib/db/schema";
import { gte, desc } from "drizzle-orm";

export type TrendingMarket = {
  marketId: string;
  delta: number;
  direction: "up" | "down";
  earliest: number;
  latest: number;
};

/**
 * Get markets with >threshold probability change in the last N hours.
 * Returns a Map<marketId, TrendingMarket> for fast lookup.
 */
export async function getTrendingMarkets(
  hoursBack = 24,
  threshold = 5
): Promise<Map<string, TrendingMarket>> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const recent = await db
    .select({
      marketId: probabilitySnapshots.marketId,
      probability: probabilitySnapshots.probability,
      recordedAt: probabilitySnapshots.recordedAt,
    })
    .from(probabilitySnapshots)
    .where(gte(probabilitySnapshots.recordedAt, since))
    .orderBy(desc(probabilitySnapshots.recordedAt));

  const byMarket = new Map<
    string,
    { earliest: number; latest: number; earliestAt: Date; latestAt: Date }
  >();

  for (const r of recent) {
    const p = Number(r.probability);
    const cur = byMarket.get(r.marketId);
    if (!cur) {
      byMarket.set(r.marketId, {
        earliest: p,
        latest: p,
        earliestAt: r.recordedAt,
        latestAt: r.recordedAt,
      });
    } else {
      if (r.recordedAt < cur.earliestAt) {
        cur.earliest = p;
        cur.earliestAt = r.recordedAt;
      }
      if (r.recordedAt > cur.latestAt) {
        cur.latest = p;
        cur.latestAt = r.recordedAt;
      }
    }
  }

  const trending = new Map<string, TrendingMarket>();
  for (const [marketId, data] of byMarket) {
    const delta = data.latest - data.earliest;
    if (Math.abs(delta) >= threshold) {
      trending.set(marketId, {
        marketId,
        delta: Math.round(delta),
        direction: delta > 0 ? "up" : "down",
        earliest: Math.round(data.earliest),
        latest: Math.round(data.latest),
      });
    }
  }

  return trending;
}
