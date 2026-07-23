import { NextResponse } from "next/server";
import {
  isBillingSimulationMode,
  resolveActivePaymentProvider,
} from "@/lib/billing/payment-provider";
import { simulateSubscriptionCancel } from "@/lib/billing/simulate-subscription";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import { getServerStripe } from "@/lib/billing/stripe-server";
import { SITE_URL } from "@/i18n/config";
import {
  ensureSubscriptionCacheHydrated,
  getAccountAssignment,
  getStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

function resolveSiteBaseUrl(): string {
  return SITE_URL.replace(/\/$/, "");
}

function resolvePortalReturnUrl(override?: string): string {
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

  return `${resolveSiteBaseUrl()}/billing`;
}

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

  const provider = resolveActivePaymentProvider();
  if (provider !== "stripe") {
    return NextResponse.json(
      { error: `Payment provider "${provider}" is not available for billing portal` },
      { status: 503 }
    );
  }

  const billingConfig = await validateBillingPaymentConfig();
  if (!billingConfig.readiness.portal.ready) {
    return NextResponse.json(
      {
        error: "Billing portal is not ready",
        code: "portal_not_ready",
        reasons: billingConfig.readiness.portal.reasons,
        warnings: billingConfig.warnings,
      },
      { status: 503 }
    );
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
    const returnUrl = resolvePortalReturnUrl(body.returnUrl);

    const session = await stripe.billingPortal.sessions.create({
      customer: mapping.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({
      url: session.url,
      provider: "stripe",
      warnings: billingConfig.warnings.length > 0 ? billingConfig.warnings : undefined,
    });
  } catch (error) {
    console.error("[billing/portal]", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
