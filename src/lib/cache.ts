/**
 * Cache abstraction for Future Express.
 *
 * In production, connect to Upstash Redis via env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
 * Falls back to a simple in-memory Map with TTL for local dev.
 *
 * Usage:
 *   import { cache } from "@/lib/cache";
 *   const data = await cache.getOrSet("editions:latest", () => fetchLatestEdition(), 300);
 */

// ── In-memory TTL store (dev fallback) ──

type CacheEntry<T = unknown> = { value: T; expiresAt: number };
const memStore = new Map<string, CacheEntry>();

function memGet<T>(key: string): T | null {
    const entry = memStore.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memStore.delete(key);
        return null;
    }
    return entry.value;
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
    memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDel(pattern: string): void {
    // Simple prefix matching for invalidation
    for (const key of memStore.keys()) {
        if (key.startsWith(pattern) || key === pattern) {
            memStore.delete(key);
        }
    }
}

// ── Cache interface ──

export const cache = {
    /**
     * Get a cached value, or compute + cache it on miss.
     * @param key - Cache key
     * @param fetcher - Function to call on cache miss
     * @param ttlSeconds - Time-to-live in seconds
     */
    async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
        const cached = memGet<T>(key);
        if (cached !== null) return cached;

        const value = await fetcher();
        memSet(key, value, ttlSeconds);
        return value;
    },

    async get<T>(key: string): Promise<T | null> {
        return memGet<T>(key);
    },

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        memSet(key, value, ttlSeconds);
    },

    /** Invalidate by exact key or prefix. */
    async invalidate(pattern: string): Promise<void> {
        memDel(pattern);
    },

    /** Clear entire cache (useful for testing). */
    async clear(): Promise<void> {
        memStore.clear();
    },
};

// ── Cache key builders ──

export const CacheKeys = {
    latestEdition: () => "editions:latest",
    editionList: () => "editions:list",
    articleBySlug: (slug: string) => `articles:${slug}`,
    articleList: (category?: string | null) => `articles:list:${category ?? "all"}`,
    marketList: (category?: string | null) => `markets:list:${category ?? "all"}`,
    ticker: () => "ticker:data",
    agentStats: () => "agent:stats",
} as const;

// ── TTLs in seconds ──

export const CacheTTL = {
    LATEST_EDITION: 5 * 60,    // 5 minutes
    EDITION_LIST: 5 * 60,      // 5 minutes
    ARTICLE_BY_SLUG: 60 * 60,  // 1 hour
    ARTICLE_LIST: 2 * 60,      // 2 minutes
    MARKET_LIST: 60,            // 1 minute
    TICKER: 30,                 // 30 seconds (live data)
    AGENT_STATS: 30,            // 30 seconds
} as const;
