import { NextResponse } from "next/server";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import { ensureSubscriptionCacheHydrated } from "@/lib/subscription/subscription-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  await ensureSubscriptionCacheHydrated();

  const effective = getEffectiveSubscription(auth.user.id, "user");
  return NextResponse.json({
    authenticated: true,
    effective,
  });
}
