import { NextResponse } from "next/server";
import { billingPlanSpec } from "@/lib/billing/plan-catalog";
import {
  isBillingSimulationMode,
  resolveActivePaymentProvider,
} from "@/lib/billing/payment-provider";
import { simulateSubscriptionCheckout } from "@/lib/billing/simulate-subscription";
import {
  getPlanStripePriceId,
  getServerStripe,
  STRIPE_SERVER_CONFIG,
} from "@/lib/billing/stripe-server";
import { planIdToTierId } from "@/lib/billing/resolve-plans";
import { getStripeCustomerMapping } from "@/lib/subscription/subscription-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { SubscriptionPlan } from "@/types/billing";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as {
      plan: SubscriptionPlan;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (body.plan === "free") {
      return NextResponse.json({ error: "Free plan is already active" }, { status: 400 });
    }

    const spec = billingPlanSpec(body.plan);
    if (!spec) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const accountId = authResult.auth.user.id;
    const successUrl = body.successUrl ?? `${origin}/billing/plans?success=true`;

    if (isBillingSimulationMode()) {
      const result = await simulateSubscriptionCheckout({
        accountId,
        plan: body.plan,
        successUrl,
      });
      return NextResponse.json({
        url: result.url,
        simulated: true,
        provider: resolveActivePaymentProvider(),
      });
    }

    const stripe = getServerStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Payment provider unavailable" }, { status: 503 });
    }

    const priceId = await getPlanStripePriceId(body.plan);
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe price ID" }, { status: 400 });
    }

    const tierId = planIdToTierId(body.plan);
    const existingCustomer = getStripeCustomerMapping(accountId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: STRIPE_SERVER_CONFIG.paymentMethodTypes,
      line_items: [{ price: priceId, quantity: 1 }],
      currency: STRIPE_SERVER_CONFIG.currency,
      success_url: successUrl,
      cancel_url: body.cancelUrl ?? `${origin}/billing/plans?cancelled=true`,
      ...(existingCustomer
        ? { customer: existingCustomer.stripeCustomerId }
        : { customer_email: authResult.auth.user.email }),
      metadata: {
        account_id: accountId,
        plan: body.plan,
        tier_id: tierId ?? "",
      },
      subscription_data: {
        metadata: {
          account_id: accountId,
          plan: body.plan,
          tier_id: tierId ?? "",
        },
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      provider: "stripe",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
