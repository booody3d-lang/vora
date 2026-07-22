import { NextResponse } from "next/server";
import { inferCheckoutPlanId } from "@/lib/billing/resolve-plans";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import {
  ensureSubscriptionCacheHydrated,
  getAccountAssignment,
  getStripeCustomerMapping,
  listSubscriptionTiers,
} from "@/lib/subscription/subscription-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { SubscriptionAudience } from "@/types/subscription";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  await ensureSubscriptionCacheHydrated();

  const { searchParams } = new URL(request.url);
  const audience = (searchParams.get("audience") === "company" ? "company" : "user") as SubscriptionAudience;

  const effective = getEffectiveSubscription(auth.user.id, audience);
  const assignment = getAccountAssignment(auth.user.id);
  const tiers = listSubscriptionTiers();
  const currentPlanId = assignment
    ? inferCheckoutPlanId(assignment.tierId, tiers, assignment.checkoutPlanId)
    : audience === "company"
      ? null
      : "free";

  return NextResponse.json({
    authenticated: true,
    audience,
    effective,
    currentPlanId,
    hasStripeCustomer: Boolean(getStripeCustomerMapping(auth.user.id)),
  });
}
