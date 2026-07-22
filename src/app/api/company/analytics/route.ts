import { NextResponse } from "next/server";
import { getAnalyticsForAccount } from "@/lib/company/analytics-store";
import { forbidCompanyAnalytics } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAnalytics(authResult.auth.user);
  if (denied) return denied;

  const { analytics, source } = await getAnalyticsForAccount(authResult.auth.user.id);

  return NextResponse.json({ analytics, source });
}
