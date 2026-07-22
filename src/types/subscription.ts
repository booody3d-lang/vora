export type SubscriptionAudience = "user" | "company";
export type BillingCycle = "monthly" | "yearly" | "lifetime" | "none";
export type SubscriptionAssignmentStatus = "active" | "cancelled" | "expired";
export type SubscriptionSource = "billing" | "manual_override" | "trial" | "free";

export interface SubscriptionFeature {
  key: string;
  labelEn: string;
  labelAr: string;
}

export interface SubscriptionTier {
  id: string;
  nameEn: string;
  nameAr: string;
  audience: SubscriptionAudience;
  priceSar: number;
  billingCycle: BillingCycle;
  features: SubscriptionFeature[];
  /** Public URL or data URL for tier badge icon (SVG preferred) */
  iconUrl?: string;
  /** Inline SVG markup for badge rendering */
  iconSvg?: string;
  /** Default Stripe Price ID for this tier's primary billing cycle */
  stripePriceId?: string;
  /** Checkout plan id → Stripe Price ID (e.g. premium_monthly on premium-user tier) */
  stripePriceIds?: Partial<Record<string, string>>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSubscriptionAssignment {
  tierId: string;
  status: SubscriptionAssignmentStatus;
  startedAt: string;
  expiresAt?: string;
  source: SubscriptionSource;
  stripeSubscriptionId?: string;
  checkoutPlanId?: string;
}

export interface ManualSubscriptionOverride {
  tierId: string;
  reason: string;
  grantedBy: string;
  grantedAt: string;
  /** Omit for lifetime / unlimited free premium */
  expiresAt?: string;
}

export interface EffectiveSubscription {
  tier: SubscriptionTier | null;
  assignment: AccountSubscriptionAssignment | null;
  override: ManualSubscriptionOverride | null;
  isPremium: boolean;
  featureKeys: string[];
  badge: {
    iconUrl?: string;
    iconSvg?: string;
    tierId?: string;
    tierNameEn?: string;
    tierNameAr?: string;
  } | null;
}
