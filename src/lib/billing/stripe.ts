import Stripe from "stripe";
import type { SubscriptionPlan } from "@/types/billing";
import { PLANS } from "@/types/billing";

let stripeInstance: Stripe | null = null;

function resolveSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe | null {
  const key = resolveSecretKey();
  if (!key) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeInstance;
}

export function getPlanStripePriceId(plan: SubscriptionPlan): string | undefined {
  return PLANS.find((p) => p.id === plan)?.stripePriceId;
}

export const STRIPE_CONFIG = {
  currency: "sar" as const,
  paymentMethodTypes: ["card"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
};

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

export function resolveStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}
