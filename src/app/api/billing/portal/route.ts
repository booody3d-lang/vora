import { NextResponse } from "next/server";
import {
  isBillingSimulationMode,
  resolveActivePaymentProvider,
} from "@/lib/billing/payment-provider";
import { simulateSubscriptionCancel } from "@/lib/billing/simulate-subscription";
import { getServerStripe } from "@/lib/billing/stripe-server";
import {
  ensureSubscriptionCacheHydrated,
  getAccountAssignment,
  getStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  await ensureSubscriptionCacheHydrated();
  const accountId = authResult.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { action?: string; returnUrl?: string };

  if (isBillingSimulationMode()) {
    if (body.action === "cancel") {
      const cancelled = await simulateSubscriptionCancel(accountId);
      if (!cancelled) {
        return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, simulated: true, cancelled: true });
    }

    const assignment = getAccountAssignment(accountId);
    return NextResponse.json({
      simulated: true,
      provider: resolveActivePaymentProvider(),
      hasActiveSubscription: assignment?.status === "active" && assignment.source === "billing",
      actions: ["cancel"],
    });
  }

  const stripe = getServerStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payment provider unavailable" }, { status: 503 });
  }

  const mapping = getStripeCustomerMapping(accountId);
  if (!mapping?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing customer found. Subscribe to a plan first." },
      { status: 400 }
    );
  }

  try {
    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: mapping.stripeCustomerId,
      return_url: body.returnUrl ?? `${origin}/billing/plans`,
    });

    return NextResponse.json({ url: session.url, provider: "stripe" });
  } catch (error) {
    console.error("[billing/portal]", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
