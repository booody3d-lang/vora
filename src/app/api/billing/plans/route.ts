import { NextResponse } from "next/server";
import { resolveBillingPlans } from "@/lib/billing/resolve-plans";
import { isServerStripeConfigured, resolveStripePublishableKey } from "@/lib/billing/stripe-server";
import {
  ensureSubscriptionCacheHydrated,
  listSubscriptionTiers,
} from "@/lib/subscription/subscription-store";

export async function GET() {
  await ensureSubscriptionCacheHydrated();
  const tiers = listSubscriptionTiers();
  const plans = resolveBillingPlans(tiers);

  return NextResponse.json({
    plans,
    stripeConfigured: isServerStripeConfigured(),
    publishableKey: resolveStripePublishableKey() ?? null,
  });
}
