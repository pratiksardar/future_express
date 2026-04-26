/**
 * Lightweight Redis facade.
 *
 * Why a facade and not just `@upstash/redis` everywhere?
 * - We need a graceful in-memory fallback for local dev (no Upstash creds).
 * - We only need ~6 commands (HLL + KV + simple lists). Keeping the surface
 *   minimal lets the in-memory shim stay small and trustworthy.
 *
 * Env: `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`. If either is missing we log
 * a one-time warning and use the in-memory shim. Never crash on missing creds —
 * "live energy" features should degrade quietly rather than break the page.
 */
import { Redis } from "@upstash/redis";

export type SetOptions = { ex?: number };

export interface RedisClient {
  /** HyperLogLog add — returns 1 if cardinality changed, else 0. */
  pfadd(key: string, ...members: string[]): Promise<number>;
  /** HyperLogLog count — approximate unique element count. */
  pfcount(key: string): Promise<number>;
  /** Set a string with optional `ex` TTL (seconds). */
  set(key: string, value: string, opts?: SetOptions): Promise<void>;
  /** Get a string value, or null if missing/expired. */
  get(key: string): Promise<string | null>;
  /** Push values to the head of a list. */
  lpush(key: string, ...values: string[]): Promise<number>;
  /** Trim list to the inclusive [start, stop] range. */
  ltrim(key: string, start: number, stop: number): Promise<void>;
  /** Read the inclusive [start, stop] range from a list. */
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  /** Set a TTL (seconds). */
  expire(key: string, seconds: number): Promise<void>;
  /** Remove a key. */
  del(key: string): Promise<void>;
}

// ── In-memory shim (dev fallback) ──────────────────────────────────────────

type ExpiringValue = { value: string | Set<string> | string[]; expiresAt: number | null };

class InMemoryRedis implements RedisClient {
  private store = new Map<string, ExpiringValue>();

  private getEntry(key: string): ExpiringValue | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async pfadd(key: string, ...members: string[]): Promise<number> {
    const entry = this.getEntry(key);
    let set: Set<string>;
    if (entry && entry.value instanceof Set) {
      set = entry.value;
    } else {
      set = new Set<string>();
      this.store.set(key, { value: set, expiresAt: entry?.expiresAt ?? null });
    }
    let changed = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        changed = 1;
      }
    }
    return changed;
  }

  async pfcount(key: string): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry || !(entry.value instanceof Set)) return 0;
    return entry.value.size;
  }

  async set(key: string, value: string, opts?: SetOptions): Promise<void> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.getEntry(key);
    if (!entry) return null;
    return typeof entry.value === "string" ? entry.value : null;
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const entry = this.getEntry(key);
    let list: string[];
    if (entry && Array.isArray(entry.value)) {
      list = entry.value;
    } else {
      list = [];
      this.store.set(key, { value: list, expiresAt: entry?.expiresAt ?? null });
    }
    // LPUSH semantics: each value is pushed to head, in argument order.
    for (const v of values) list.unshift(v);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const entry = this.getEntry(key);
    if (!entry || !Array.isArray(entry.value)) return;
    // Redis LTRIM: stop is inclusive. Negative indices count from end.
    const len = entry.value.length;
    const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const e = stop < 0 ? Math.max(-1, len + stop) : Math.min(stop, len - 1);
    entry.value.splice(0, entry.value.length, ...entry.value.slice(s, e + 1));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const entry = this.getEntry(key);
    if (!entry || !Array.isArray(entry.value)) return [];
    const len = entry.value.length;
    const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const e = stop < 0 ? Math.max(-1, len + stop) : Math.min(stop, len - 1);
    return entry.value.slice(s, e + 1);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + seconds * 1000;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ── Upstash adapter ────────────────────────────────────────────────────────

class UpstashRedisAdapter implements RedisClient {
  constructor(private readonly client: Redis) {}

  async pfadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    // Upstash typings list pfadd as (key, ...members) returning number.
    const r = await this.client.pfadd(key, ...members);
    return typeof r === "number" ? r : 0;
  }

  async pfcount(key: string): Promise<number> {
    const r = await this.client.pfcount(key);
    return typeof r === "number" ? r : 0;
  }

  async set(key: string, value: string, opts?: SetOptions): Promise<void> {
    if (opts?.ex) {
      await this.client.set(key, value, { ex: opts.ex });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const v = await this.client.get<string>(key);
    return v == null ? null : String(v);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (values.length === 0) return 0;
    const r = await this.client.lpush(key, ...values);
    return typeof r === "number" ? r : 0;
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const r = await this.client.lrange(key, start, stop);
    return Array.isArray(r) ? r.map((v) => String(v)) : [];
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// ── Singleton resolver ─────────────────────────────────────────────────────

let cachedClient: RedisClient | null = null;
let warned = false;

export function getRedis(): RedisClient {
  if (cachedClient) return cachedClient;

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (url && token) {
    const upstash = new Redis({ url, token });
    cachedClient = new UpstashRedisAdapter(upstash);
  } else {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.warn(
        "[redis] UPSTASH_REDIS_URL/UPSTASH_REDIS_TOKEN not set — using in-memory shim. " +
          "Live counts will not survive process restarts and won't sync across instances."
      );
      warned = true;
    }
    cachedClient = new InMemoryRedis();
  }
  return cachedClient;
}

/** Test seam: clear cached client so a fresh instance is built. */
export function __resetRedisForTesting(): void {
  cachedClient = null;
  warned = false;
}
