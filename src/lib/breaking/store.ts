/**
 * Redis-backed store for breaking-news alerts.
 *
 * Keyspace:
 *   - breaking:{marketId}      → JSON payload, TTL 6h (suppression window)
 *   - breaking:recent          → list of marketIds, newest at head, capped to 10
 *   - breaking:payload:{id}    → JSON payload, TTL 24h (read by /recent)
 *
 * Two payload keys (rather than one) because the suppression key MUST expire
 * at 6h to allow re-alerting, but the read-back payload should live longer
 * so the banner can survive a soft refresh after the suppression has lifted.
 */
import { getRedis } from "@/lib/redis";

export type BreakingAlert = {
  marketId: string;
  articleId: string;
  slug: string;
  headline: string;
  probabilityBefore: number;
  probabilityNow: number;
  delta: number;
  alertedAt: string; // ISO
};

const SUPPRESS_KEY = (marketId: string) => `breaking:${marketId}`;
const PAYLOAD_KEY = (marketId: string) => `breaking:payload:${marketId}`;
const RECENT_LIST = "breaking:recent";
const SUPPRESS_TTL_SEC = 6 * 60 * 60; // 6h
const PAYLOAD_TTL_SEC = 24 * 60 * 60; // 24h
const RECENT_MAX = 10;

/** True if a suppression entry is still live for this market. */
export async function isAlertSuppressed(marketId: string): Promise<boolean> {
  const r = getRedis();
  const v = await r.get(SUPPRESS_KEY(marketId));
  return v != null;
}

/** Record an alert: sets suppression, stores payload, prepends to recent list. */
export async function recordAlert(alert: BreakingAlert): Promise<void> {
  const r = getRedis();
  const payload = JSON.stringify(alert);
  await Promise.all([
    r.set(SUPPRESS_KEY(alert.marketId), "1", { ex: SUPPRESS_TTL_SEC }),
    r.set(PAYLOAD_KEY(alert.marketId), payload, { ex: PAYLOAD_TTL_SEC }),
  ]);
  await r.lpush(RECENT_LIST, alert.marketId);
  await r.ltrim(RECENT_LIST, 0, RECENT_MAX - 1);
}

/** Fetch the most recent N alerts (newest first). */
export async function getRecentAlerts(limit = RECENT_MAX): Promise<BreakingAlert[]> {
  const r = getRedis();
  const ids = await r.lrange(RECENT_LIST, 0, Math.max(0, limit - 1));
  if (ids.length === 0) return [];
  const payloads = await Promise.all(ids.map((id) => r.get(PAYLOAD_KEY(id))));
  const out: BreakingAlert[] = [];
  for (const p of payloads) {
    if (!p) continue;
    try {
      out.push(JSON.parse(p) as BreakingAlert);
    } catch {
      // Skip malformed entries; payload TTL will eventually evict them.
    }
  }
  return out;
}
