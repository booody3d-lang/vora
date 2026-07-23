import { NextResponse } from "next/server";
import { isBillingSimulationMode } from "@/lib/billing/payment-provider";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import { logDomainError } from "@/lib/monitoring/log";
import { getServerStripe } from "@/lib/billing/stripe-server";
import {
  handleStripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe-webhook-handlers";
import {
  ensureSubscriptionCacheHydrated,
  isStripeEventProcessed,
} from "@/lib/subscription/subscription-store";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint for live billing.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/billing/webhook
 * Copy the webhook signing secret from the CLI output into STRIPE_WEBHOOK_SECRET.
 *
 * Simulation mode bypasses this route — checkout uses simulate-subscription.ts directly.
 */
export async function POST(request: Request) {
  if (isBillingSimulationMode()) {
    return NextResponse.json({
      received: false,
      inactive: true,
      reason: "Billing runs in simulation mode; Stripe webhooks are not processed",
    });
  }

  const billingConfig = await validateBillingPaymentConfig();
  if (!billingConfig.readiness.webhooks.ready) {
    return NextResponse.json(
      {
        error: "Stripe webhooks are not ready",
        code: "webhooks_not_ready",
        reasons: billingConfig.readiness.webhooks.reasons,
      },
      { status: 503 }
    );
  }

  const stripe = getServerStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verified = verifyStripeWebhookSignature(stripe, rawBody, signature);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  await ensureSubscriptionCacheHydrated();

  if (isStripeEventProcessed(verified.event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeWebhookEvent(stripe, verified.event);
  } catch (error) {
    logDomainError("billing", "Stripe webhook handler failed", error, {
      eventType: verified.event.type,
      eventId: verified.event.id,
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
