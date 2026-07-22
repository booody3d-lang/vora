import "server-only";

import Stripe from "stripe";
import { resolvePlanStripePriceId } from "@/lib/billing/resolve-plans";
import {
  ensureSubscriptionCacheHydrated,
  listSubscriptionTiers,
} from "@/lib/subscription/subscription-store";
import { getStripeConfig } from "@/lib/security/auth-store";
import type { SubscriptionPlan } from "@/types/billing";

let stripeInstance: Stripe | null = null;

export function resolveStripeSecretKey(): string | undefined {
  const config = getStripeConfig();
  return config.secretKey ?? process.env.STRIPE_SECRET_KEY;
}

export function resolveStripeWebhookSecret(): string | undefined {
  const config = getStripeConfig();
  return config.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
}

export function resolveStripePublishableKey(): string | undefined {
  const config = getStripeConfig();
  return config.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export function getServerStripe(): Stripe | null {
  const key = resolveStripeSecretKey();
  if (!key) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeInstance;
}

export async function getPlanStripePriceId(plan: SubscriptionPlan): Promise<string | undefined> {
  await ensureSubscriptionCacheHydrated();
  return resolvePlanStripePriceId(plan, listSubscriptionTiers());
}

export const STRIPE_SERVER_CONFIG = {
  currency: "sar" as const,
  paymentMethodTypes: ["card"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
};

export function isServerStripeConfigured(): boolean {
  return Boolean(resolveStripeSecretKey() && resolveStripePublishableKey());
}
