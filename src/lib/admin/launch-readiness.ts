import "server-only";

import { validateRedisConfig } from "@/lib/cache/redis-config-validation";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import { validateCronDiagnostics } from "@/lib/cron/cron-diagnostics";
import { isStrictProduction } from "@/lib/env/validate";
import { buildHealthReport } from "@/lib/monitoring/health";
import { isSentryConfigured } from "@/lib/monitoring/sentry";
import { validateNotificationProviderConfig } from "@/lib/notifications/provider-config-validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DEV_JWT_MARKER = "vora-dev-jwt-secret";
const DEV_PEPPER = "vora-pepper-2026";

export const DEFERRED_LAUNCH_ITEMS = ["stripe_live", "demo_removal"] as const;

export type DeferredLaunchItem = (typeof DEFERRED_LAUNCH_ITEMS)[number];

export interface LaunchReadinessCheck {
  ok: boolean;
  detail?: string;
  optional?: boolean;
}

export interface LaunchReadinessReport {
  readyForSoftLaunch: boolean;
  deferred: DeferredLaunchItem[];
  environment: {
    nodeEnv: string;
    vercelEnv: string | null;
    strictProduction: boolean;
  };
  checks: {
    supabase: LaunchReadinessCheck;
    authSecrets: LaunchReadinessCheck;
    siteUrl: LaunchReadinessCheck;
    billing: LaunchReadinessCheck & { mode: string; simulationMode: boolean };
    otp: LaunchReadinessCheck;
    email: LaunchReadinessCheck;
    cron: LaunchReadinessCheck;
    redis: LaunchReadinessCheck;
    sentry: LaunchReadinessCheck;
    health: LaunchReadinessCheck & { status: "ok" | "degraded" };
  };
  warnings: string[];
  endpoints: {
    health: string;
    billingDiagnostics: string;
    notificationsDiagnostics: string;
    cronDiagnostics: string;
    cacheDiagnostics: string;
    monitoringDiagnostics: string;
    launchReadiness: string;
  };
  generatedAt: string;
}

function checkAuthSecrets(): LaunchReadinessCheck {
  const jwt = process.env.JWT_SECRET?.trim() ?? "";
  const pepper = process.env.PASSWORD_PEPPER?.trim() ?? "";

  if (!jwt || !pepper) {
    return {
      ok: false,
      detail: "JWT_SECRET and PASSWORD_PEPPER are required",
    };
  }

  if (isStrictProduction()) {
    if (jwt.includes(DEV_JWT_MARKER)) {
      return { ok: false, detail: "JWT_SECRET must not use the development default in production" };
    }
    if (pepper === DEV_PEPPER) {
      return { ok: false, detail: "PASSWORD_PEPPER must not use the development default in production" };
    }
  }

  return { ok: true };
}

function checkSiteUrl(): LaunchReadinessCheck {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    return { ok: false, detail: "NEXT_PUBLIC_SITE_URL is required for auth redirects" };
  }
  if (siteUrl.includes("localhost") && isStrictProduction()) {
    return { ok: false, detail: "NEXT_PUBLIC_SITE_URL must be the production domain" };
  }
  return { ok: true };
}

/** Owner-only consolidated soft-launch readiness — Stripe simulation does not block. */
export async function buildLaunchReadinessReport(): Promise<LaunchReadinessReport> {
  const [health, billing, notifications, cron, redis] = await Promise.all([
    buildHealthReport(),
    validateBillingPaymentConfig(),
    Promise.resolve(validateNotificationProviderConfig()),
    Promise.resolve(validateCronDiagnostics()),
    validateRedisConfig(),
  ]);

  const warnings: string[] = [
    ...billing.warnings,
    ...notifications.warnings,
    ...cron.warnings,
    ...redis.warnings,
  ];

  const supabase: LaunchReadinessCheck = {
    ok: isSupabaseConfigured(),
    detail: isSupabaseConfigured() ? undefined : "Supabase URL or anon key missing",
  };

  const authSecrets = checkAuthSecrets();
  const siteUrl = checkSiteUrl();

  const billingCheck: LaunchReadinessReport["checks"]["billing"] = {
    ok: true,
    mode: billing.simulationMode ? "simulation" : billing.activeProvider,
    simulationMode: billing.simulationMode,
    detail: billing.simulationMode
      ? "Simulation billing active — deferred until legal approval for Stripe live"
      : undefined,
  };

  if (billing.simulationMode) {
    warnings.push(
      "Billing is in simulation mode (expected for soft launch — Stripe live deferred until legal approval)"
    );
  }

  const otp: LaunchReadinessCheck = isStrictProduction()
    ? { ok: true }
    : {
        ok: notifications.otp.readiness.sms.ready,
        detail: notifications.otp.readiness.sms.reasons[0],
      };

  const email: LaunchReadinessCheck = {
    ok: notifications.email.readiness.transactional.ready,
    detail: notifications.email.readiness.transactional.reasons[0],
  };

  const cronCheck: LaunchReadinessCheck = {
    ok: cron.readiness.cronAuth.ready,
    detail: cron.readiness.cronAuth.reasons[0],
  };

  const redisCheck: LaunchReadinessCheck = {
    ok: !redis.configured || redis.connectivity.ok,
    optional: true,
    detail: redis.connectivity.detail,
  };

  if (!redis.configured && isStrictProduction()) {
    warnings.push("Redis is not configured — rate limits and search cache use in-memory fallback");
  }

  const sentryConfigured = isSentryConfigured();
  const sentryCheck: LaunchReadinessCheck = {
    ok: sentryConfigured || !isStrictProduction(),
    optional: true,
    detail: sentryConfigured ? undefined : "Sentry DSN not configured (optional but recommended)",
  };

  if (!sentryConfigured && isStrictProduction()) {
    warnings.push("Sentry is not configured — error monitoring is disabled");
  }

  warnings.push("Demo accounts and mock data remain enabled until legal approval (deferred)");

  const healthCheck: LaunchReadinessReport["checks"]["health"] = {
    ok: health.status === "ok",
    status: health.status,
    detail: health.status === "degraded" ? "One or more health checks are degraded" : undefined,
  };

  const checks = {
    supabase,
    authSecrets,
    siteUrl,
    billing: billingCheck,
    otp,
    email,
    cron: cronCheck,
    redis: redisCheck,
    sentry: sentryCheck,
    health: healthCheck,
  };

  const blockingChecks = [
    supabase,
    authSecrets,
    siteUrl,
    billingCheck,
    otp,
    email,
    cronCheck,
  ];

  const readyForSoftLaunch = blockingChecks.every((check) => check.ok);

  return {
    readyForSoftLaunch,
    deferred: [...DEFERRED_LAUNCH_ITEMS],
    environment: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      vercelEnv: process.env.VERCEL_ENV ?? null,
      strictProduction: isStrictProduction(),
    },
    checks,
    warnings: [...new Set(warnings)],
    endpoints: {
      health: "/api/health",
      billingDiagnostics: "/api/admin/billing/diagnostics",
      notificationsDiagnostics: "/api/admin/notifications/diagnostics",
      cronDiagnostics: "/api/admin/cron/diagnostics",
      cacheDiagnostics: "/api/admin/cache/diagnostics",
      monitoringDiagnostics: "/api/admin/monitoring/diagnostics",
      launchReadiness: "/api/admin/launch/readiness",
    },
    generatedAt: new Date().toISOString(),
  };
}
