import Stripe from "stripe";
import type { SubscriptionPlan } from "@/types/billing";
import { PLANS } from "@/types/billing";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
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
  // Mada is enabled automatically for SAR via Stripe when configured in dashboard
};

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
