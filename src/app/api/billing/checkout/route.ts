import { NextResponse } from "next/server";
import { billingPlanSpec } from "@/lib/billing/plan-catalog";
import {
  isBillingSimulationMode,
  resolveActivePaymentProvider,
} from "@/lib/billing/payment-provider";
import { simulateSubscriptionCheckout } from "@/lib/billing/simulate-subscription";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import {
  getPlanStripePriceId,
  getServerStripe,
  STRIPE_SERVER_CONFIG,
} from "@/lib/billing/stripe-server";
import { planIdToTierId } from "@/lib/billing/resolve-plans";
import { getStripeCustomerMapping } from "@/lib/subscription/subscription-store";
import { SITE_URL } from "@/i18n/config";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { SubscriptionPlan } from "@/types/billing";

function resolveSiteBaseUrl(): string {
  return SITE_URL.replace(/\/$/, "");
}

function resolveCheckoutUrl(path: string, override?: string): string {
  if (override) {
    try {
      const candidate = new URL(override, resolveSiteBaseUrl());
      const siteOrigin = new URL(resolveSiteBaseUrl()).origin;
      if (candidate.origin === siteOrigin) {
        return candidate.toString();
      }
    } catch {
      // Fall back to site URL defaults below.
    }
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveSiteBaseUrl()}${normalizedPath}`;
}

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

    const accountId = authResult.auth.user.id;
    const successUrl = resolveCheckoutUrl("/billing/plans?success=true", body.successUrl);
    const cancelUrl = resolveCheckoutUrl("/billing/plans?cancelled=true", body.cancelUrl);

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

    const provider = resolveActivePaymentProvider();
    if (provider !== "stripe") {
      return NextResponse.json(
        { error: `Payment provider "${provider}" is not available for checkout` },
        { status: 503 }
      );
    }

    const billingConfig = await validateBillingPaymentConfig();
    if (!billingConfig.readiness.checkout.ready) {
      return NextResponse.json(
        {
          error: "Billing checkout is not ready",
          code: "checkout_not_ready",
          reasons: billingConfig.readiness.checkout.reasons,
          warnings: billingConfig.warnings,
        },
        { status: 503 }
      );
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
      cancel_url: cancelUrl,
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
      warnings: billingConfig.warnings.length > 0 ? billingConfig.warnings : undefined,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
