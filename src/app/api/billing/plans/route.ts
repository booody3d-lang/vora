import { NextResponse } from "next/server";
import {
  getPaymentProviderLabel,
  isBillingSimulationMode,
  resolveActivePaymentProvider,
} from "@/lib/billing/payment-provider";
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
  const provider = resolveActivePaymentProvider();
  const simulationMode = isBillingSimulationMode();

  return NextResponse.json({
    plans,
    paymentProvider: provider,
    paymentProviderLabel: getPaymentProviderLabel(provider),
    simulationMode,
    stripeConfigured: isServerStripeConfigured(),
    publishableKey: simulationMode ? null : resolveStripePublishableKey() ?? null,
  });
}
