/**
 * Presence keys are bucketed by minute. Sliding-window count = current + previous.
 *
 * - Bucket TTL is 2 minutes — long enough that the previous bucket is still
 *   readable when we sum, short enough that stale buckets self-evict and we
 *   don't accumulate cardinality forever in HLL keys.
 * - Slug is in the key (not a session attribute) so HyperLogLog cardinality is
 *   per-article. PFCOUNT across two buckets sums approximate cardinalities; we
 *   accept that overlap (a session that pings in both minutes is counted in
 *   both) — it's a tiny over-count and the metric is "rough but live".
 */
export function presenceKey(slug: string, minuteEpoch: number): string {
  return `presence:${slug}:${minuteEpoch}`;
}

export function currentMinute(now: number = Date.now()): number {
  return Math.floor(now / 60_000);
}
