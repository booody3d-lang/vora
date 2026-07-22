import { NextResponse } from "next/server";
import { getCompanyPublishState } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const publish = await getCompanyPublishState(authResult.auth.user.id);

  return NextResponse.json({
    allowed: publish.allowed,
    reason: publish.reason,
    source: publish.source,
    state: publish.state,
    subscription: publish.subscription,
  });
}
