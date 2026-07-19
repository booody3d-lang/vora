import "server-only";

import {
  getAccountAssignment,
  getManualOverride,
  getSubscriptionTier,
  listSubscriptionTiers,
} from "@/lib/subscription/subscription-store";
import type {
  EffectiveSubscription,
  SubscriptionAudience,
  SubscriptionTier,
} from "@/types/subscription";

const PREMIUM_FEATURE_KEYS = new Set([
  "premium_badge",
  "ai_access",
  "analytics_full",
  "unlimited_uploads",
  "search_boost",
  "unlimited_jobs",
  "ats_full",
  "company_analytics",
]);

function isOverrideActive(override: ReturnType<typeof getManualOverride>): boolean {
  if (!override) return false;
  if (!override.expiresAt) return true;
  return new Date(override.expiresAt).getTime() > Date.now();
}

function isAssignmentActive(assignment: ReturnType<typeof getAccountAssignment>): boolean {
  if (!assignment || assignment.status !== "active") return false;
  if (!assignment.expiresAt) return true;
  return new Date(assignment.expiresAt).getTime() > Date.now();
}

function tierBadge(tier: SubscriptionTier | null) {
  if (!tier || tier.id === "free-user") return null;
  if (!tier.iconUrl && !tier.iconSvg) return null;
  return {
    iconUrl: tier.iconUrl,
    iconSvg: tier.iconSvg,
    tierId: tier.id,
    tierNameEn: tier.nameEn,
    tierNameAr: tier.nameAr,
  };
}

export function getEffectiveSubscription(
  accountId: string,
  audience: SubscriptionAudience = "user"
): EffectiveSubscription {
  const override = getManualOverride(accountId);
  const assignment = getAccountAssignment(accountId);
  const freeTier =
    listSubscriptionTiers(audience).find((t) => t.priceSar === 0) ??
    listSubscriptionTiers(audience)[0] ??
    null;

  let tier: SubscriptionTier | null = freeTier;
  const activeAssignment = assignment;
  const activeOverride = override;

  if (isOverrideActive(override)) {
    tier = getSubscriptionTier(override!.tierId) ?? tier;
  } else if (isAssignmentActive(assignment)) {
    tier = getSubscriptionTier(assignment!.tierId) ?? tier;
  }

  const featureKeys = tier?.features.map((f) => f.key) ?? [];
  const isPremium =
    featureKeys.some((key) => PREMIUM_FEATURE_KEYS.has(key)) ||
    Boolean(tier && tier.id !== "free-user" && tier.priceSar > 0);

  return {
    tier,
    assignment: activeAssignment,
    override: isOverrideActive(override) ? activeOverride : null,
    isPremium,
    featureKeys,
    badge: tierBadge(tier),
  };
}

export function accountHasFeature(
  accountId: string,
  featureKey: string,
  audience: SubscriptionAudience = "user"
): boolean {
  const effective = getEffectiveSubscription(accountId, audience);
  return effective.featureKeys.includes(featureKey);
}

export function isPremiumAccount(
  accountId: string,
  audience: SubscriptionAudience = "user"
): boolean {
  return getEffectiveSubscription(accountId, audience).isPremium;
}
