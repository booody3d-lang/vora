import "server-only";

import { validateRedisConfig } from "@/lib/cache/redis-config-validation";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import { validateCronDiagnostics } from "@/lib/cron/cron-diagnostics";
import { isStrictProduction } from "@/lib/env/validate";
import { validateNotificationProviderConfig } from "@/lib/notifications/provider-config-validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface HealthCheck {
  ok: boolean;
  detail?: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    supabase: HealthCheck;
    stripe: HealthCheck;
    otp: HealthCheck;
    email: HealthCheck;
    cron: HealthCheck;
    redis: HealthCheck;
  };
}

function checkWithDetail(ok: boolean, detail?: string): HealthCheck {
  return ok ? { ok: true } : { ok: false, detail };
}

/** Aggregate readiness checks for public /api/health and admin monitoring. */
export async function buildHealthReport(): Promise<HealthReport> {
  const timestamp = new Date().toISOString();

  const supabaseOk = isSupabaseConfigured();
  const supabase = checkWithDetail(
    supabaseOk,
    supabaseOk ? undefined : "Supabase URL or anon key missing"
  );

  const billing = await validateBillingPaymentConfig();
  const stripe = billing.simulationMode
    ? { ok: true as const, detail: "simulation mode" }
    : checkWithDetail(
        billing.readiness.checkout.ready,
        billing.readiness.checkout.reasons[0]
      );

  const notifications = validateNotificationProviderConfig();
  const otp = checkWithDetail(
    notifications.otp.readiness.sms.ready,
    notifications.otp.readiness.sms.reasons[0]
  );
  const email = checkWithDetail(
    notifications.email.readiness.transactional.ready,
    notifications.email.readiness.transactional.reasons[0]
  );

  const cronDiag = validateCronDiagnostics();
  const cron = checkWithDetail(
    cronDiag.readiness.cronAuth.ready,
    cronDiag.readiness.cronAuth.reasons[0]
  );

  const redisDiag = await validateRedisConfig();
  const redis = redisDiag.configured
    ? checkWithDetail(redisDiag.connectivity.ok, redisDiag.connectivity.detail)
    : { ok: true as const, detail: "not configured (optional)" };

  const checks = { supabase, stripe, otp, email, cron, redis };
  const allOk = Object.values(checks).every((check) => check.ok);

  return {
    status: allOk ? "ok" : "degraded",
    timestamp,
    checks,
  };
}

/** 503 when Supabase is missing in production; otherwise 200 for ok/degraded. */
export function resolveHealthHttpStatus(report: HealthReport): number {
  if (isStrictProduction() && !report.checks.supabase.ok) {
    return 503;
  }
  return 200;
}
