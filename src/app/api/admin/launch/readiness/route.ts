import { NextResponse } from "next/server";
import { buildLaunchReadinessReport } from "@/lib/admin/launch-readiness";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export const runtime = "nodejs";

/** Owner-only consolidated soft-launch readiness report. */
export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const report = await buildLaunchReadinessReport();
  return NextResponse.json(report);
}
