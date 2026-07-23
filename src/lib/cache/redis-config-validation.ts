import "server-only";

import { isRedisConfigured, redisPing } from "@/lib/cache/redis";

export interface RedisConfigValidation {
  configured: boolean;
  missingFields: string[];
  keyPresence: {
    url: boolean;
    token: boolean;
  };
  connectivity: {
    checked: boolean;
    ok: boolean;
    detail?: string;
  };
  usage: {
    rateLimitStore: "redis" | "memory";
    searchCache: "redis" | "memory";
  };
  warnings: string[];
}

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function collectMissingFields(keyPresence: RedisConfigValidation["keyPresence"]): string[] {
  const missing: string[] = [];
  if (!keyPresence.url) missing.push("REDIS_URL");
  if (!keyPresence.token) missing.push("REDIS_TOKEN");
  return missing;
}

/** Server-only Redis configuration validation for diagnostics and health checks. */
export async function validateRedisConfig(): Promise<RedisConfigValidation> {
  const keyPresence = {
    url: envPresent("REDIS_URL"),
    token: envPresent("REDIS_TOKEN"),
  };

  const configured = isRedisConfigured();
  const missingFields = collectMissingFields(keyPresence);
  const warnings: string[] = [];

  if (keyPresence.url && !keyPresence.token) {
    warnings.push("REDIS_URL is set but REDIS_TOKEN is missing — Redis is disabled");
  }
  if (!keyPresence.url && keyPresence.token) {
    warnings.push("REDIS_TOKEN is set but REDIS_URL is missing — Redis is disabled");
  }

  let connectivity: RedisConfigValidation["connectivity"] = {
    checked: false,
    ok: false,
  };

  if (configured) {
    const pingOk = await redisPing();
    connectivity = {
      checked: true,
      ok: pingOk,
      detail: pingOk ? undefined : "Upstash PING failed — check REDIS_URL and REDIS_TOKEN",
    };
    if (!pingOk) {
      warnings.push("Redis credentials are present but connectivity check failed; falling back to in-memory cache");
    }
  } else {
    connectivity = {
      checked: false,
      ok: true,
      detail: "not configured (optional)",
    };
  }

  const storeMode = configured && connectivity.ok ? "redis" : "memory";

  return {
    configured,
    missingFields,
    keyPresence,
    connectivity,
    usage: {
      rateLimitStore: storeMode,
      searchCache: storeMode,
    },
    warnings,
  };
}
