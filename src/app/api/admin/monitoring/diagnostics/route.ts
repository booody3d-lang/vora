import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/monitoring/health";
import { isSentryConfigured } from "@/lib/monitoring/sentry";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const health = await buildHealthReport();

  return NextResponse.json({
    sentry: {
      configured: isSentryConfigured(),
      dsnPresent: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()),
    },
    health: {
      status: health.status,
      timestamp: health.timestamp,
      checks: health.checks,
    },
    endpoints: {
      health: "/api/health",
    },
  });
}
