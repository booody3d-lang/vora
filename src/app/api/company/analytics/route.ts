import { NextResponse } from "next/server";
import { DEMO_ANALYTICS } from "@/lib/company/mock-data";
import { forbidCompanyAnalytics } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAnalytics(authResult.auth.user);
  if (denied) return denied;

  return NextResponse.json({
    analytics: DEMO_ANALYTICS,
    source: "demo",
    note: "Live analytics from Supabase lands in Phase 5F",
  });
}
