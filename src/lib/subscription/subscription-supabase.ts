import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AccountSubscriptionAssignment,
  ManualSubscriptionOverride,
  SubscriptionFeature,
  SubscriptionTier,
} from "@/types/subscription";
import type {
  StripeCustomerMapping,
  StripePaymentEvent,
  StripeRefundRecord,
} from "@/lib/subscription/subscription-store";

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

interface DbTierRow {
  id: string;
  name_en: string;
  name_ar: string;
  audience: SubscriptionTier["audience"];
  price_sar: number;
  billing_cycle: SubscriptionTier["billingCycle"];
  features: SubscriptionFeature[] | null;
  icon_url: string | null;
  icon_svg: string | null;
  sort_order: number;
  is_active: boolean;
  stripe_price_id: string | null;
  stripe_price_ids: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

interface DbAssignmentRow {
  account_id: string;
  tier_id: string;
  status: AccountSubscriptionAssignment["status"];
  started_at: string;
  expires_at: string | null;
  source: AccountSubscriptionAssignment["source"];
  stripe_subscription_id: string | null;
  checkout_plan_id: string | null;
  updated_at: string;
}

interface DbOverrideRow {
  account_id: string;
  tier_id: string;
  reason: string;
  granted_by: string;
  granted_at: string;
  expires_at: string | null;
}

export interface SubscriptionSnapshot {
  tiers: SubscriptionTier[];
  assignments: Record<string, AccountSubscriptionAssignment>;
  overrides: Record<string, ManualSubscriptionOverride>;
  stripeCustomers: Record<string, StripeCustomerMapping>;
  paymentEvents: StripePaymentEvent[];
  refunds: StripeRefundRecord[];
}

function mapTierRow(row: DbTierRow): SubscriptionTier {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    audience: row.audience,
    priceSar: Number(row.price_sar),
    billingCycle: row.billing_cycle,
    features: Array.isArray(row.features) ? row.features : [],
    iconUrl: row.icon_url ?? undefined,
    iconSvg: row.icon_svg ?? undefined,
    stripePriceId: row.stripe_price_id ?? undefined,
    stripePriceIds: row.stripe_price_ids ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTierToRow(tier: SubscriptionTier): Record<string, unknown> {
  return {
    id: tier.id,
    name_en: tier.nameEn,
    name_ar: tier.nameAr,
    audience: tier.audience,
    price_sar: tier.priceSar,
    billing_cycle: tier.billingCycle,
    features: tier.features,
    icon_url: tier.iconUrl ?? null,
    icon_svg: tier.iconSvg ?? null,
    sort_order: tier.sortOrder,
    is_active: tier.isActive,
    stripe_price_id: tier.stripePriceId ?? null,
    stripe_price_ids: tier.stripePriceIds ?? {},
    updated_at: tier.updatedAt,
    created_at: tier.createdAt,
  };
}

function tierIsPremium(tier: SubscriptionTier | null | undefined): boolean {
  if (!tier || tier.id === "free-user" || tier.priceSar <= 0) return false;
  return tier.features.some((feature) => PREMIUM_FEATURE_KEYS.has(feature.key));
}

export async function loadSubscriptionSnapshotFromSupabase(): Promise<SubscriptionSnapshot> {
  const admin = createAdminClient();

  const [
    { data: tierRows, error: tierError },
    { data: assignmentRows, error: assignmentError },
    { data: overrideRows, error: overrideError },
    { data: customerRows, error: customerError },
    { data: paymentRows, error: paymentError },
    { data: refundRows, error: refundError },
  ] = await Promise.all([
    admin.from("subscription_tiers").select("*").order("sort_order", { ascending: true }),
    admin.from("account_subscription_assignments").select("*"),
    admin.from("subscription_manual_overrides").select("*"),
    admin.from("stripe_customer_mappings").select("*"),
    admin
      .from("stripe_payment_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("stripe_refund_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (tierError) throw tierError;
  if (assignmentError) throw assignmentError;
  if (overrideError) throw overrideError;
  if (customerError) throw customerError;
  if (paymentError) throw paymentError;
  if (refundError) throw refundError;

  const tiers = ((tierRows ?? []) as DbTierRow[]).map(mapTierRow);

  const assignments: Record<string, AccountSubscriptionAssignment> = {};
  for (const row of (assignmentRows ?? []) as DbAssignmentRow[]) {
    assignments[row.account_id] = {
      tierId: row.tier_id,
      status: row.status,
      startedAt: row.started_at,
      expiresAt: row.expires_at ?? undefined,
      source: row.source,
      stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
      checkoutPlanId: row.checkout_plan_id ?? undefined,
    };
  }

  const overrides: Record<string, ManualSubscriptionOverride> = {};
  for (const row of (overrideRows ?? []) as DbOverrideRow[]) {
    overrides[row.account_id] = {
      tierId: row.tier_id,
      reason: row.reason,
      grantedBy: row.granted_by,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at ?? undefined,
    };
  }

  const stripeCustomers: Record<string, StripeCustomerMapping> = {};
  for (const row of customerRows ?? []) {
    stripeCustomers[row.account_id] = {
      accountId: row.account_id,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const paymentEvents: StripePaymentEvent[] = (paymentRows ?? []).map((row) => ({
    id: row.id,
    stripeEventId: row.stripe_event_id,
    type: row.type,
    accountId: row.account_id ?? undefined,
    tierId: row.tier_id ?? undefined,
    amountSar: row.amount_sar != null ? Number(row.amount_sar) : undefined,
    currency: row.currency ?? "sar",
    status: row.status,
    payloadSummary: (row.payload_summary as Record<string, unknown> | null) ?? undefined,
    createdAt: row.created_at,
  }));

  const refunds: StripeRefundRecord[] = (refundRows ?? []).map((row) => ({
    id: row.id,
    paymentIntentId: row.payment_intent_id,
    amountSar: Number(row.amount_sar),
    reason: row.reason ?? undefined,
    status: row.status,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
  }));

  return {
    tiers,
    assignments,
    overrides,
    stripeCustomers,
    paymentEvents,
    refunds,
  };
}

export async function countSubscriptionTiersInSupabase(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("subscription_tiers")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function upsertSubscriptionTierInSupabase(tier: SubscriptionTier): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("subscription_tiers").upsert(mapTierToRow(tier), {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function deleteSubscriptionTierInSupabase(tierId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("subscription_tiers").delete().eq("id", tierId);
  if (error) throw error;
}

export async function setAccountAssignmentInSupabase(
  accountId: string,
  assignment: AccountSubscriptionAssignment,
  tiers: SubscriptionTier[]
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("account_subscription_assignments").upsert(
    {
      account_id: accountId,
      tier_id: assignment.tierId,
      status: assignment.status,
      started_at: assignment.startedAt,
      expires_at: assignment.expiresAt ?? null,
      source: assignment.source,
      stripe_subscription_id: assignment.stripeSubscriptionId ?? null,
      checkout_plan_id: assignment.checkoutPlanId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
  if (error) throw error;

  const tier = tiers.find((item) => item.id === assignment.tierId) ?? null;
  await syncProfilePremiumInSupabase(accountId, tierIsPremium(tier));
}

export async function setManualOverrideInSupabase(
  accountId: string,
  override: ManualSubscriptionOverride,
  tiers: SubscriptionTier[]
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("subscription_manual_overrides").upsert(
    {
      account_id: accountId,
      tier_id: override.tierId,
      reason: override.reason,
      granted_by: override.grantedBy,
      granted_at: override.grantedAt,
      expires_at: override.expiresAt ?? null,
    },
    { onConflict: "account_id" }
  );
  if (error) throw error;

  const tier = tiers.find((item) => item.id === override.tierId) ?? null;
  await syncProfilePremiumInSupabase(accountId, tierIsPremium(tier));
}

export async function removeManualOverrideInSupabase(
  accountId: string,
  tiers: SubscriptionTier[],
  assignment: AccountSubscriptionAssignment | null
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscription_manual_overrides")
    .delete()
    .eq("account_id", accountId);
  if (error) throw error;

  const tier = assignment
    ? tiers.find((item) => item.id === assignment.tierId) ?? null
    : tiers.find((item) => item.priceSar === 0 && item.audience === "user") ?? null;
  await syncProfilePremiumInSupabase(accountId, tierIsPremium(tier));
}

export async function setStripeCustomerMappingInSupabase(
  accountId: string,
  mapping: StripeCustomerMapping
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_customer_mappings").upsert(
    {
      account_id: accountId,
      stripe_customer_id: mapping.stripeCustomerId,
      created_at: mapping.createdAt,
      updated_at: mapping.updatedAt,
    },
    { onConflict: "account_id" }
  );
  if (error) throw error;
}

export async function recordStripePaymentEventInSupabase(event: StripePaymentEvent): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_payment_events").upsert(
    {
      id: event.id,
      stripe_event_id: event.stripeEventId,
      type: event.type,
      account_id: event.accountId ?? null,
      tier_id: event.tierId ?? null,
      amount_sar: event.amountSar ?? null,
      currency: event.currency ?? "sar",
      status: event.status,
      payload_summary: event.payloadSummary ?? null,
      created_at: event.createdAt,
    },
    { onConflict: "stripe_event_id" }
  );
  if (error) throw error;
}

export async function recordStripeRefundInSupabase(refund: StripeRefundRecord): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_refund_records").upsert(
    {
      id: refund.id,
      payment_intent_id: refund.paymentIntentId,
      amount_sar: refund.amountSar,
      reason: refund.reason ?? null,
      status: refund.status,
      requested_by: refund.requestedBy,
      created_at: refund.createdAt,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function syncProfilePremiumInSupabase(
  accountId: string,
  isPremium: boolean
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("professional_profiles")
    .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
    .eq("account_id", accountId);
  if (error && !error.message.includes("professional_profiles")) {
    throw error;
  }
}

export async function migrateJsonSubscriptionToSupabase(
  snapshot: SubscriptionSnapshot
): Promise<number> {
  const admin = createAdminClient();
  const existingCount = await countSubscriptionTiersInSupabase();
  if (existingCount > 0 && snapshot.tiers.length === 0) return 0;

  for (const tier of snapshot.tiers) {
    await upsertSubscriptionTierInSupabase(tier);
  }

  for (const [accountId, assignment] of Object.entries(snapshot.assignments)) {
    await admin.from("account_subscription_assignments").upsert(
      {
        account_id: accountId,
        tier_id: assignment.tierId,
        status: assignment.status,
        started_at: assignment.startedAt,
        expires_at: assignment.expiresAt ?? null,
        source: assignment.source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );

    const tier = snapshot.tiers.find((item) => item.id === assignment.tierId) ?? null;
    await syncProfilePremiumInSupabase(accountId, tierIsPremium(tier));
  }

  for (const [accountId, override] of Object.entries(snapshot.overrides)) {
    await admin.from("subscription_manual_overrides").upsert(
      {
        account_id: accountId,
        tier_id: override.tierId,
        reason: override.reason,
        granted_by: override.grantedBy,
        granted_at: override.grantedAt,
        expires_at: override.expiresAt ?? null,
      },
      { onConflict: "account_id" }
    );

    const tier = snapshot.tiers.find((item) => item.id === override.tierId) ?? null;
    await syncProfilePremiumInSupabase(accountId, tierIsPremium(tier));
  }

  for (const mapping of Object.values(snapshot.stripeCustomers)) {
    await setStripeCustomerMappingInSupabase(mapping.accountId, mapping);
  }

  for (const event of snapshot.paymentEvents.slice(0, 500)) {
    await recordStripePaymentEventInSupabase(event);
  }

  for (const refund of snapshot.refunds.slice(0, 500)) {
    await recordStripeRefundInSupabase(refund);
  }

  return snapshot.tiers.length;
}
