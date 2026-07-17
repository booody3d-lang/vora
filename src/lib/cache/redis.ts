/**
 * Redis caching layer — production configuration.
 * Set REDIS_URL in Vercel environment variables.
 * Uses Upstash Redis REST API or ioredis when configured.
 */

export interface CacheOptions {
  ttlSeconds?: number;
}

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // Upstash REST pattern
      const res = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${process.env.REDIS_TOKEN ?? ""}` },
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const data = await res.json() as { result?: string };
        return data.result ? JSON.parse(data.result) as T : null;
      }
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

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      await fetch(`${redisUrl}/set/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REDIS_TOKEN ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: serialized, ex: ttl }),
      });
      return;
    } catch {
      // Fall through
    }
  }

  memoryCache.set(key, { value: serialized, expiresAt: Date.now() + ttl * 1000 });
}

export const CACHE_KEYS = {
  featuredServices: "vora:featured:services",
  trendingJobs: "vora:trending:jobs",
  publicStore: (slug: string) => `vora:store:${slug}`,
} as const;
