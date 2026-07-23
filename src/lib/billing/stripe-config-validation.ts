import "server-only";

import { billingPlanSpec, ENV_STRIPE_PRICE_FALLBACKS } from "@/lib/billing/plan-catalog";
import {
  isBillingSimulationMode,
  resolveActivePaymentProvider,
  type PaymentProviderId,
} from "@/lib/billing/payment-provider";
import { resolvePlanStripePriceId } from "@/lib/billing/resolve-plans";
import { isServerStripeConfigured } from "@/lib/billing/stripe-server";
import { getStripeConfig } from "@/lib/security/auth-store";
import {
  ensureSubscriptionCacheHydrated,
  listSubscriptionTiers,
} from "@/lib/subscription/subscription-store";
import type { SubscriptionPlan } from "@/types/billing";

type ConfigKeySource = "admin" | "env" | "none";

export interface BillingReadinessCheck {
  ready: boolean;
  reasons: string[];
}

export interface BillingPaymentConfigValidation {
  activeProvider: PaymentProviderId;
  simulationMode: boolean;
  forcedMode: PaymentProviderId | "auto";
  stripe: {
    configured: boolean;
    missingFields: string[];
    priceIds: Record<
      "premium_monthly" | "premium_yearly" | "company_annual",
      { configured: boolean; source: "tier" | "env" | "none" }
    >;
    keyPresence: {
      secret: boolean;
      publishable: boolean;
      webhook: boolean;
    };
    keySources: {
      secret: ConfigKeySource;
      publishable: ConfigKeySource;
      webhook: ConfigKeySource;
    };
  };
  readiness: {
    checkout: BillingReadinessCheck;
    webhooks: BillingReadinessCheck;
    portal: BillingReadinessCheck;
  };
  warnings: string[];
}

const PAID_PLANS = ["premium_monthly", "premium_yearly", "company_annual"] as const;

function readForcedMode(): PaymentProviderId | "auto" {
  const raw = process.env.BILLING_PAYMENT_MODE?.trim().toLowerCase();
  if (!raw || raw === "auto") return "auto";
  if (raw === "mock" || raw === "simulate" || raw === "simulation") return "simulation";
  if (raw === "stripe" || raw === "moyasar" || raw === "tap") return raw;
  return "auto";
}

function resolveKeySource(adminValue: string | undefined, envValue: string | undefined): ConfigKeySource {
  if (adminValue) return "admin";
  if (envValue) return "env";
  return "none";
}

function resolvePriceIdSource(
  planId: SubscriptionPlan,
  tiers: ReturnType<typeof listSubscriptionTiers>
): "tier" | "env" | "none" {
  const spec = billingPlanSpec(planId);
  if (!spec) return "none";

  const tier = tiers.find((entry) => entry.id === spec.tierId);
  if (tier?.stripePriceIds?.[planId]) return "tier";
  if (tier?.stripePriceId && resolvePlanStripePriceId(planId, tiers) === tier.stripePriceId) {
    return "tier";
  }
  if (ENV_STRIPE_PRICE_FALLBACKS[planId]) return "env";
  return "none";
}

function collectStripeMissingFields(keyPresence: BillingPaymentConfigValidation["stripe"]["keyPresence"]): string[] {
  const missing: string[] = [];
  if (!keyPresence.secret) missing.push("STRIPE_SECRET_KEY");
  if (!keyPresence.publishable) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (!keyPresence.webhook) missing.push("STRIPE_WEBHOOK_SECRET");
  return missing;
}

function assessStripeCheckoutReadiness(
  stripeConfigured: boolean,
  missingPricePlans: SubscriptionPlan[]
): BillingReadinessCheck {
  const reasons: string[] = [];
  if (!stripeConfigured) {
    reasons.push("Stripe secret and publishable keys are required");
  }
  if (missingPricePlans.length > 0) {
    reasons.push(`Missing Stripe price IDs for: ${missingPricePlans.join(", ")}`);
  }
  return { ready: reasons.length === 0, reasons };
}

function assessStripeWebhookReadiness(
  stripeConfigured: boolean,
  webhookPresent: boolean
): BillingReadinessCheck {
  const reasons: string[] = [];
  if (!stripeConfigured) {
    reasons.push("Stripe secret and publishable keys are required");
  }
  if (!webhookPresent) {
    reasons.push("STRIPE_WEBHOOK_SECRET is required for webhook signature verification");
  }
  return { ready: reasons.length === 0, reasons };
}

function assessStripePortalReadiness(stripeConfigured: boolean): BillingReadinessCheck {
  if (stripeConfigured) {
    return { ready: true, reasons: [] };
  }
  return {
    ready: false,
    reasons: ["Stripe secret and publishable keys are required"],
  };
}

/** Server-only billing/Stripe configuration validation for diagnostics and admin tooling. */
export async function validateBillingPaymentConfig(): Promise<BillingPaymentConfigValidation> {
  await ensureSubscriptionCacheHydrated();
  const tiers = listSubscriptionTiers();
  const adminConfig = getStripeConfig();

  const keySources = {
    secret: resolveKeySource(adminConfig.secretKey, process.env.STRIPE_SECRET_KEY),
    publishable: resolveKeySource(
      adminConfig.publishableKey,
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
    webhook: resolveKeySource(adminConfig.webhookSecret, process.env.STRIPE_WEBHOOK_SECRET),
  };

  const keyPresence = {
    secret: keySources.secret !== "none",
    publishable: keySources.publishable !== "none",
    webhook: keySources.webhook !== "none",
  };

  const stripeConfigured = isServerStripeConfigured();
  const missingFields = collectStripeMissingFields(keyPresence);

  const priceIds = {} as BillingPaymentConfigValidation["stripe"]["priceIds"];
  const missingPricePlans: SubscriptionPlan[] = [];

  for (const planId of PAID_PLANS) {
    const resolved = resolvePlanStripePriceId(planId, tiers);
    const source = resolvePriceIdSource(planId, tiers);
    priceIds[planId] = {
      configured: Boolean(resolved),
      source: resolved ? source : "none",
    };
    if (!resolved) {
      missingPricePlans.push(planId);
      missingFields.push(
        planId === "premium_monthly"
          ? "STRIPE_PREMIUM_MONTHLY_PRICE_ID"
          : planId === "premium_yearly"
            ? "STRIPE_PREMIUM_YEARLY_PRICE_ID"
            : "STRIPE_COMPANY_ANNUAL_PRICE_ID"
      );
    }
  }

  const forcedMode = readForcedMode();
  const activeProvider = resolveActivePaymentProvider();
  const simulationMode = isBillingSimulationMode();
  const warnings: string[] = [];

  if (forcedMode === "stripe" && !stripeConfigured) {
    warnings.push(
      "BILLING_PAYMENT_MODE=stripe but Stripe keys are incomplete; checkout is falling back to simulation"
    );
  }

  if (simulationMode && missingFields.length > 0) {
    warnings.push(
      "Simulation mode is active; complete Stripe configuration before switching BILLING_PAYMENT_MODE to stripe or auto"
    );
  }

  if (stripeConfigured && !keyPresence.webhook) {
    warnings.push("Stripe checkout keys are present but STRIPE_WEBHOOK_SECRET is missing");
  }

  const stripeCheckout = assessStripeCheckoutReadiness(stripeConfigured, missingPricePlans);
  const stripeWebhooks = assessStripeWebhookReadiness(stripeConfigured, keyPresence.webhook);
  const stripePortal = assessStripePortalReadiness(stripeConfigured);

  let readiness: BillingPaymentConfigValidation["readiness"];

  if (simulationMode) {
    readiness = {
      checkout: { ready: true, reasons: [] },
      webhooks: {
        ready: false,
        reasons: ["Stripe webhooks are inactive while billing runs in simulation mode"],
      },
      portal: { ready: true, reasons: [] },
    };
  } else if (activeProvider === "stripe") {
    readiness = {
      checkout: stripeCheckout,
      webhooks: stripeWebhooks,
      portal: stripePortal,
    };
  } else {
    readiness = {
      checkout: { ready: false, reasons: [`Payment provider "${activeProvider}" is not fully wired yet`] },
      webhooks: { ready: false, reasons: [`Webhooks for "${activeProvider}" are not implemented`] },
      portal: { ready: false, reasons: [`Billing portal for "${activeProvider}" is not implemented`] },
    };
  }

  return {
    activeProvider,
    simulationMode,
    forcedMode,
    stripe: {
      configured: stripeConfigured,
      missingFields,
      priceIds,
      keyPresence,
      keySources,
    },
    readiness,
    warnings,
  };
}
