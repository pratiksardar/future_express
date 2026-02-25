"use server";

import { db } from "@/lib/db";
import {
  markets,
  probabilitySnapshots,
} from "@/lib/db/schema";
import { fetchPolymarketEvents } from "./polymarket";
import { fetchKalshiMarkets } from "./kalshi";
import { normalizePolymarketEvent, normalizeKalshiMarket, matchScore } from "./normalize";
import type { NormalizedMarket } from "./types";
import { eq, sql } from "drizzle-orm";

const CROSS_MATCH_THRESHOLD = 0.75;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function runIngestion(): Promise<{
  polymarketCount: number;
  kalshiCount: number;
  mergedCount: number;
  snapshotCount: number;
}> {
  const [polyEvents, kalshiMarkets] = await Promise.all([
    fetchPolymarketEvents(100),
    fetchKalshiMarkets(100).catch(() => []),
  ]);

  const polyNormalized = polyEvents.map(normalizePolymarketEvent);
  const kalshiNormalized = kalshiMarkets.map(normalizeKalshiMarket);

  const existingByPoly = new Map<string, string>();
  const existingByKalshi = new Map<string, string>();
  const existing = await db.select().from(markets);
  for (const m of existing) {
    if (m.polymarketId) existingByPoly.set(m.polymarketId, m.id);
    if (m.kalshiTicker) existingByKalshi.set(m.kalshiTicker, m.id);
  }

  let mergedCount = 0;
  const toUpsert: Array<{
    id?: string;
    polymarketId?: string;
    kalshiTicker?: string;
    title: string;
    description?: string;
    category: "politics" | "economy" | "crypto" | "sports" | "science" | "entertainment" | "world";
    currentProbability: string;
    polymarketProbability?: string;
    kalshiProbability?: string;
    volume24h?: string;
    status: "active" | "closed" | "resolved";
    resolutionOutcome?: string;
    resolvedAt?: Date;
    polymarketSlug?: string;
    kalshiEventTicker?: string;
  }> = [];

  const usedKalshi = new Set<string>();

  for (const n of polyNormalized) {
    const existingId = n.polymarketId ? existingByPoly.get(n.polymarketId) : undefined;
    let bestKalshi: NormalizedMarket | null = null;
    let bestScore = 0;
    for (const k of kalshiNormalized) {
      if (usedKalshi.has(k.kalshiTicker ?? "")) continue;
      const score = matchScore(n.title, k.title);
      if (score >= CROSS_MATCH_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestKalshi = k;
      }
    }
    if (bestKalshi) {
      usedKalshi.add(bestKalshi.kalshiTicker ?? "");
      mergedCount++;
    }
    const prob = n.currentProbability;
    const kProb = bestKalshi?.kalshiProbability;
    const currentProb = kProb != null ? String(Math.round((parseFloat(prob) + parseFloat(kProb)) / 2)) : prob;
    toUpsert.push({
      ...(existingId && { id: existingId }),
      polymarketId: n.polymarketId,
      kalshiTicker: bestKalshi?.kalshiTicker,
      kalshiEventTicker: bestKalshi?.kalshiEventTicker,
      title: n.title,
      description: n.description,
      category: n.category,
      currentProbability: currentProb,
      polymarketProbability: n.polymarketProbability,
      kalshiProbability: bestKalshi?.kalshiProbability,
      volume24h: n.volume24h,
      status: n.status,
      polymarketSlug: n.polymarketSlug,
    });
  }

  for (const k of kalshiNormalized) {
    if (usedKalshi.has(k.kalshiTicker ?? "")) continue;
    const existingId = k.kalshiTicker ? existingByKalshi.get(k.kalshiTicker) : undefined;
    toUpsert.push({
      ...(existingId && { id: existingId }),
      kalshiTicker: k.kalshiTicker,
      kalshiEventTicker: k.kalshiEventTicker,
      title: k.title,
      description: k.description,
      category: k.category,
      currentProbability: k.currentProbability,
      kalshiProbability: k.kalshiProbability,
      volume24h: k.volume24h,
      status: k.status,
      resolutionOutcome: k.resolutionOutcome,
    });
  }

  // ── Bulk upsert markets (single query instead of 200+ individual INSERT/UPDATEs) ──
  const snapshotInserts: Array<{
    marketId: string;
    source: "polymarket" | "kalshi";
    probability: string;
    volume?: string;
  }> = [];

  // Prepare all rows with their final IDs
  const bulkValues = toUpsert.map((row) => {
    const existingId =
      row.id ??
      (row.polymarketId ? existingByPoly.get(row.polymarketId) : undefined) ??
      (row.kalshiTicker ? existingByKalshi.get(row.kalshiTicker) : undefined);
    const marketId = existingId ?? crypto.randomUUID();

    // Collect snapshots while we iterate
    if (row.polymarketProbability)
      snapshotInserts.push({
        marketId,
        source: "polymarket",
        probability: row.polymarketProbability,
        volume: row.volume24h,
      });
    if (row.kalshiProbability)
      snapshotInserts.push({
        marketId,
        source: "kalshi",
        probability: row.kalshiProbability,
        volume: row.volume24h,
      });

    return {
      id: marketId,
      polymarketId: row.polymarketId ?? null,
      kalshiTicker: row.kalshiTicker ?? null,
      title: row.title,
      description: row.description ?? null,
      category: row.category,
      currentProbability: row.currentProbability,
      polymarketProbability: row.polymarketProbability ?? null,
      kalshiProbability: row.kalshiProbability ?? null,
      volume24h: row.volume24h ?? null,
      status: row.status,
      resolutionOutcome: row.resolutionOutcome ?? null,
      polymarketSlug: row.polymarketSlug ?? null,
      kalshiEventTicker: row.kalshiEventTicker ?? null,
      updatedAt: new Date(),
    };
  });

  // Bulk upsert all markets in a single query
  if (bulkValues.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < bulkValues.length; i += CHUNK_SIZE) {
      const chunk = bulkValues.slice(i, i + CHUNK_SIZE);
      await db
        .insert(markets)
        .values(chunk)
        .onConflictDoUpdate({
          target: markets.id,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            category: sql`excluded.category`,
            currentProbability: sql`excluded.current_probability`,
            polymarketProbability: sql`excluded.polymarket_probability`,
            kalshiProbability: sql`excluded.kalshi_probability`,
            volume24h: sql`excluded.volume_24h`,
            status: sql`excluded.status`,
            polymarketSlug: sql`excluded.polymarket_slug`,
            kalshiEventTicker: sql`excluded.kalshi_event_ticker`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
  }

  // Batch insert all probability snapshots in a single query
  if (snapshotInserts.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < snapshotInserts.length; i += CHUNK_SIZE) {
      const chunk = snapshotInserts.slice(i, i + CHUNK_SIZE).map((s) => ({
        marketId: s.marketId,
        source: s.source,
        probability: s.probability,
        volume: s.volume ?? null,
      }));
      await db.insert(probabilitySnapshots).values(chunk);
    }
  }

  return {
    polymarketCount: polyNormalized.length,
    kalshiCount: kalshiNormalized.length,
    mergedCount,
    snapshotCount: snapshotInserts.length,
  };
}

