import "server-only";

/**
 * Redis caching layer — optional Upstash REST integration.
 * Set REDIS_URL + REDIS_TOKEN in environment variables.
 * Falls back to in-process memory when unset or unreachable.
 */

export interface CacheOptions {
  ttlSeconds?: number;
}

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim() && process.env.REDIS_TOKEN?.trim());
}

async function upstashCommand<T = unknown>(...args: (string | number)[]): Promise<T | null> {
  const url = process.env.REDIS_URL?.trim();
  const token = process.env.REDIS_TOKEN?.trim();
  if (!url || !token) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) return null;
  return data.result ?? null;
}

/** Ping Upstash when configured; returns false when unset or unreachable. */
export async function redisPing(): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const result = await upstashCommand<string>("PING");
    return result === "PONG";
  } catch {
    return false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isRedisConfigured()) {
    try {
      const raw = await upstashCommand<string>("GET", key);
      if (raw) return JSON.parse(raw) as T;
      if (raw === "") return null;
      return null;
    } catch {
      // Fall through to memory cache
    }
  }

  const entry = memoryCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(key: string, value: unknown, opts?: CacheOptions): Promise<void> {
  const ttl = opts?.ttlSeconds ?? 300;
  const serialized = JSON.stringify(value);

  if (isRedisConfigured()) {
    try {
      const result = await upstashCommand<string>("SET", key, serialized, "EX", ttl);
      if (result === "OK") return;
    } catch {
      // Fall through
    }
  }

  memoryCache.set(key, { value: serialized, expiresAt: Date.now() + ttl * 1000 });
}

export async function cacheDelete(key: string): Promise<void> {
  if (isRedisConfigured()) {
    try {
      await upstashCommand<number>("DEL", key);
    } catch {
      // Fall through
    }
  }
  memoryCache.delete(key);
}

export const CACHE_KEYS = {
  featuredServices: "vora:featured:services",
  trendingJobs: "vora:trending:jobs",
  publicStore: (slug: string) => `vora:store:${slug}`,
  searchResults: (query: string, type: string | undefined, limit: number) =>
    `vora:search:${type ?? "all"}:${limit}:${query.trim().toLowerCase()}`,
  searchIndexMeta: "vora:search:index-meta",
  rateLimit: (key: string) => `vora:rl:${key}`,
} as const;
