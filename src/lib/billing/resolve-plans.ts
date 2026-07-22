import "server-only";

import {
  BILLING_PLAN_SPECS,
  ENV_STRIPE_PRICE_FALLBACKS,
  PLAN_TO_TIER,
  billingPlanSpec,
} from "@/lib/billing/plan-catalog";
import type { PlanDefinition, SubscriptionPlan } from "@/types/billing";
import type { SubscriptionTier } from "@/types/subscription";

function tierById(tiers: SubscriptionTier[], tierId: string): SubscriptionTier | undefined {
  return tiers.find((tier) => tier.id === tierId);
}

export function resolveTierStripePriceId(
  tier: SubscriptionTier | undefined,
  planId: SubscriptionPlan
): string | undefined {
  if (!tier) return ENV_STRIPE_PRICE_FALLBACKS[planId];

  const fromMap = tier.stripePriceIds?.[planId];
  if (fromMap) return fromMap;

  const spec = billingPlanSpec(planId);
  if (tier.stripePriceId && spec && tier.billingCycle === planIntervalToBillingCycle(spec.interval)) {
    return tier.stripePriceId;
  }

  return ENV_STRIPE_PRICE_FALLBACKS[planId];
}

function planIntervalToBillingCycle(
  interval: PlanDefinition["interval"]
): SubscriptionTier["billingCycle"] {
  if (interval === "month") return "monthly";
  if (interval === "year") return "yearly";
  return "none";
}

export function resolvePlanStripePriceId(
  planId: SubscriptionPlan,
  tiers: SubscriptionTier[]
): string | undefined {
  const spec = billingPlanSpec(planId);
  if (!spec || spec.id === "free") return undefined;
  return resolveTierStripePriceId(tierById(tiers, spec.tierId), planId);
}

export function resolveBillingPlans(tiers: SubscriptionTier[]): PlanDefinition[] {
  return BILLING_PLAN_SPECS.map((spec) => {
    const tier = tierById(tiers, spec.tierId);
    const priceSar = tier && spec.id !== "free" ? tier.priceSar : spec.priceSar;

    return {
      id: spec.id,
      nameEn: tier?.nameEn && spec.id !== "free" ? tier.nameEn : spec.nameEn,
      nameAr: tier?.nameAr && spec.id !== "free" ? tier.nameAr : spec.nameAr,
      priceSar,
      interval: spec.interval,
      target: spec.target,
      features:
        tier && tier.features.length > 0 && spec.id !== "free"
          ? tier.features.map((feature) => feature.labelEn)
          : spec.features,
      featuresAr:
        tier && tier.features.length > 0 && spec.id !== "free"
          ? tier.features.map((feature) => feature.labelAr)
          : spec.featuresAr,
      stripePriceId: resolvePlanStripePriceId(spec.id, tiers),
      tierId: spec.tierId,
    };
  });
}

export function resolveTierAndPlanFromStripePriceId(
  priceId: string,
  tiers: SubscriptionTier[]
): { planId: SubscriptionPlan; tierId: string } | null {
  for (const spec of BILLING_PLAN_SPECS) {
    if (spec.id === "free") continue;
    if (resolvePlanStripePriceId(spec.id, tiers) === priceId) {
      return { planId: spec.id, tierId: spec.tierId };
    }
  }
  return null;
}

export function planIdToTierId(planId: string): string | undefined {
  return PLAN_TO_TIER[planId as SubscriptionPlan];
}

export function inferCheckoutPlanId(
  tierId: string,
  tiers: SubscriptionTier[],
  checkoutPlanId?: string
): SubscriptionPlan | null {
  if (checkoutPlanId && billingPlanSpec(checkoutPlanId as SubscriptionPlan)) {
    return checkoutPlanId as SubscriptionPlan;
  }

  const tier = tierById(tiers, tierId);
  if (!tier) return null;

  const candidates = BILLING_PLAN_SPECS.filter((spec) => spec.tierId === tierId && spec.id !== "free");
  if (candidates.length === 1) return candidates[0].id;

  return (
    candidates.find(
      (spec) => planIntervalToBillingCycle(spec.interval) === tier.billingCycle
    )?.id ?? candidates[0]?.id ?? null
  );
}
