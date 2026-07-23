import { CACHE_KEYS, isRedisConfigured } from "@/lib/cache/redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export const RATE_LIMITS = {
  standard: { maxRequests: 60, windowMs: 60_000 },
  auth: { maxRequests: 5, windowMs: 15 * 60_000 },
  otp: { maxRequests: 3, windowMs: 15 * 60_000 },
} as const;

function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

async function upstashRateLimitCommand<T = unknown>(...args: (string | number)[]): Promise<T | null> {
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

async function checkRateLimitRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redisKey = CACHE_KEYS.rateLimit(key);
  const windowSec = Math.max(1, Math.ceil(config.windowMs / 1000));

  const count = await upstashRateLimitCommand<number>("INCR", redisKey);
  if (count === null) {
    throw new Error("Redis rate limit unavailable");
  }

  if (count === 1) {
    await upstashRateLimitCommand<number>("EXPIRE", redisKey, windowSec);
  }

  const ttl = await upstashRateLimitCommand<number>("TTL", redisKey);
  const resetAt = Date.now() + (typeof ttl === "number" && ttl > 0 ? ttl * 1000 : config.windowMs);

  if (count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt,
  };
}

/** Rate limit check — uses Redis when configured, otherwise in-memory per instance. */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (isRedisConfigured()) {
    try {
      return await checkRateLimitRedis(key, config);
    } catch {
      // Fall through to in-memory store
    }
  }
  return checkRateLimitMemory(key, config);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

export function rateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
