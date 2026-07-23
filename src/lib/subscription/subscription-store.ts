import "server-only";

import { planIdToTierId } from "@/lib/billing/resolve-plans";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  deleteSubscriptionTierInSupabase,
  loadSubscriptionSnapshotFromSupabase,
  migrateJsonSubscriptionToSupabase,
  recordStripePaymentEventInSupabase,
  recordStripeRefundInSupabase,
  removeManualOverrideInSupabase,
  setAccountAssignmentInSupabase,
  setManualOverrideInSupabase,
  setStripeCustomerMappingInSupabase,
  upsertSubscriptionTierInSupabase,
  type SubscriptionSnapshot,
} from "@/lib/subscription/subscription-supabase";
import { syncAccountPremiumProfile } from "@/lib/subscription/sync-premium-profile";
import { syncCompanySubscriptionFromStripe } from "@/lib/company/company-billing-sync";
import type {
  AccountSubscriptionAssignment,
  ManualSubscriptionOverride,
  SubscriptionTier,
} from "@/types/subscription";

const DATA_FILE = "subscription-data.json";
const MIGRATION_FLAG = "subscription-supabase-migrated.json";

export type StripePaymentEventStatus = "received" | "processed" | "failed" | "refunded";

export interface StripeCustomerMapping {
  accountId: string;
  stripeCustomerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripePaymentEvent {
  id: string;
  stripeEventId: string;
  type: string;
  accountId?: string;
  tierId?: string;
  amountSar?: number;
  currency?: string;
  status: StripePaymentEventStatus;
  payloadSummary?: Record<string, unknown>;
  createdAt: string;
}

export interface StripeRefundRecord {
  id: string;
  paymentIntentId: string;
  amountSar: number;
  reason?: string;
  status: "pending" | "succeeded" | "failed";
  requestedBy: string;
  createdAt: string;
}

type SubscriptionDataFile = SubscriptionSnapshot;

let subscriptionTableProbed = false;
let subscriptionTableAvailable = false;
let memorySnapshot: SubscriptionDataFile | null = null;
let hydratePromise: Promise<void> | null = null;

export async function isSubscriptionSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (subscriptionTableProbed) return subscriptionTableAvailable;

  subscriptionTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("subscription_tiers").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("subscription_tiers missing", error);
      }
      subscriptionTableAvailable = false;
      return false;
    }
    subscriptionTableAvailable = true;
    return true;
  } catch {
    subscriptionTableAvailable = false;
    return false;
  }
}

function defaultTiers(): SubscriptionTier[] {
  const now = new Date().toISOString();
  return [
    {
      id: "free-user",
      nameEn: "Free",
      nameAr: "مجاني",
      audience: "user",
      priceSar: 0,
      billingCycle: "none",
      features: [
        { key: "network_access", labelEn: "Full network access", labelAr: "وصول كامل للشبكة" },
        { key: "marketplace", labelEn: "Marketplace access", labelAr: "وصول للسوق" },
      ],
      sortOrder: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "premium-user",
      nameEn: "Premium",
      nameAr: "بريميوم",
      audience: "user",
      priceSar: 20,
      billingCycle: "monthly",
      iconSvg:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>',
      features: [
        { key: "premium_badge", labelEn: "Premium badge", labelAr: "شارة بريميوم" },
        { key: "ai_access", labelEn: "VORA AI access", labelAr: "وصول VORA AI" },
        { key: "analytics_full", labelEn: "Full profile analytics", labelAr: "تحليلات كاملة" },
        { key: "unlimited_uploads", labelEn: "Unlimited uploads", labelAr: "رفع غير محدود" },
        { key: "search_boost", labelEn: "Search visibility boost", labelAr: "تعزيز الظهور في البحث" },
      ],
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "company-standard",
      nameEn: "Company Standard",
      nameAr: "شركات قياسي",
      audience: "company",
      priceSar: 600,
      billingCycle: "yearly",
      iconSvg:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B5998"><path d="M12 7V3H2v18h20V7H12zm-2 12H4v-2h6v2zm0-4H4v-2h6v2zm0-4H4V9h6v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2z"/></svg>',
      features: [
        { key: "unlimited_jobs", labelEn: "Unlimited job posts", labelAr: "وظائف غير محدودة" },
        { key: "ats_full", labelEn: "Full ATS pipeline", labelAr: "نظام ATS كامل" },
        { key: "company_analytics", labelEn: "Company analytics", labelAr: "تحليلات الشركة" },
      ],
      sortOrder: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function readJsonData(): SubscriptionDataFile {
  const data = readJsonStore(DATA_FILE, () => ({
    tiers: defaultTiers(),
    assignments: {} as Record<string, AccountSubscriptionAssignment>,
    overrides: {} as Record<string, ManualSubscriptionOverride>,
    stripeCustomers: {} as Record<string, StripeCustomerMapping>,
    paymentEvents: [] as StripePaymentEvent[],
    refunds: [] as StripeRefundRecord[],
  }));
  if (!data.tiers?.length) data.tiers = defaultTiers();
  if (!data.assignments) data.assignments = {};
  if (!data.overrides) data.overrides = {};
  if (!data.stripeCustomers) data.stripeCustomers = {};
  if (!data.paymentEvents) data.paymentEvents = [];
  if (!data.refunds) data.refunds = [];
  return data;
}

function writeJsonData(data: SubscriptionDataFile) {
  writeJsonStore(DATA_FILE, data);
}

function getSnapshot(): SubscriptionDataFile {
  return memorySnapshot ?? readJsonData();
}

function setSnapshot(data: SubscriptionDataFile) {
  memorySnapshot = data;
  writeJsonData(data);
}

async function maybeMigrateJsonToSupabase(): Promise<void> {
  if (!(await isSubscriptionSupabaseReady())) return;

  const flag = readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean }));
  if (flag.done) return;

  const jsonData = readJsonData();
  await runOptionalDbSyncVoid("subscription-json-migration", async () => {
    await migrateJsonSubscriptionToSupabase(jsonData);
    writeJsonStore(MIGRATION_FLAG, {
      done: true,
      migratedAt: new Date().toISOString(),
      tierCount: jsonData.tiers.length,
      assignmentCount: Object.keys(jsonData.assignments).length,
    });
  });

  if (!readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean })).done) {
    writeJsonStore(MIGRATION_FLAG, { done: true, skipped: true });
  }
}

export async function ensureSubscriptionCacheHydrated(): Promise<void> {
  if (hydratePromise) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    if (!(await isSubscriptionSupabaseReady())) {
      memorySnapshot = readJsonData();
      return;
    }

    await maybeMigrateJsonToSupabase();

    const loaded = await runOptionalDbSync(
      "hydrateSubscriptionCache",
      () => loadSubscriptionSnapshotFromSupabase(),
      readJsonData()
    );

    memorySnapshot = loaded;
  })();

  try {
    await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}


export function listSubscriptionTiers(audience?: SubscriptionTier["audience"]): SubscriptionTier[] {
  const data = getSnapshot();
  return data.tiers
    .filter((tier) => tier.isActive || !audience)
    .filter((tier) => !audience || tier.audience === audience)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubscriptionTier(tierId: string): SubscriptionTier | null {
  return getSnapshot().tiers.find((tier) => tier.id === tierId) ?? null;
}

export async function createSubscriptionTier(
  input: Omit<SubscriptionTier, "id" | "createdAt" | "updatedAt" | "sortOrder"> & {
    sortOrder?: number;
  }
): Promise<SubscriptionTier> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const now = new Date().toISOString();
  const tier: SubscriptionTier = {
    ...input,
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sortOrder: input.sortOrder ?? data.tiers.length,
    createdAt: now,
    updatedAt: now,
  };

  data.tiers.push(tier);
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("createSubscriptionTier", () =>
      upsertSubscriptionTierInSupabase(tier)
    );
  }

  return tier;
}

export async function updateSubscriptionTier(
  tierId: string,
  patch: Partial<Omit<SubscriptionTier, "id" | "createdAt">>
): Promise<SubscriptionTier | null> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const index = data.tiers.findIndex((tier) => tier.id === tierId);
  if (index < 0) return null;

  data.tiers[index] = {
    ...data.tiers[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("updateSubscriptionTier", () =>
      upsertSubscriptionTierInSupabase(data.tiers[index])
    );
  }

  return data.tiers[index];
}

export async function deleteSubscriptionTier(tierId: string): Promise<boolean> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const before = data.tiers.length;
  data.tiers = data.tiers.filter((tier) => tier.id !== tierId);
  if (data.tiers.length === before) return false;

  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("deleteSubscriptionTier", () =>
      deleteSubscriptionTierInSupabase(tierId)
    );
  }

  return true;
}

export function getAccountAssignment(accountId: string): AccountSubscriptionAssignment | null {
  return getSnapshot().assignments[accountId] ?? null;
}

export async function setAccountAssignment(
  accountId: string,
  assignment: AccountSubscriptionAssignment
): Promise<AccountSubscriptionAssignment> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  data.assignments[accountId] = assignment;
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("setAccountAssignment", () =>
      setAccountAssignmentInSupabase(accountId, assignment, data.tiers)
    );
  }

  await syncAccountPremiumProfile(accountId);

  return assignment;
}

export function getManualOverride(accountId: string): ManualSubscriptionOverride | null {
  return getSnapshot().overrides[accountId] ?? null;
}

export async function setManualOverride(
  accountId: string,
  override: ManualSubscriptionOverride
): Promise<ManualSubscriptionOverride> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  data.overrides[accountId] = override;
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("setManualOverride", () =>
      setManualOverrideInSupabase(accountId, override, data.tiers)
    );
  }

  await syncAccountPremiumProfile(accountId);

  return override;
}

export async function removeManualOverride(accountId: string): Promise<boolean> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  if (!data.overrides[accountId]) return false;
  delete data.overrides[accountId];
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("removeManualOverride", () =>
      removeManualOverrideInSupabase(accountId, data.tiers, data.assignments[accountId] ?? null)
    );
  }

  await syncAccountPremiumProfile(accountId);

  return true;
}

export function getAllOverrides(): Record<string, ManualSubscriptionOverride> {
  return getSnapshot().overrides;
}

export function getStripeCustomerMapping(accountId: string): StripeCustomerMapping | null {
  return getSnapshot().stripeCustomers[accountId] ?? null;
}

export function findAccountIdByStripeCustomerId(stripeCustomerId: string): string | null {
  const data = getSnapshot();
  for (const [accountId, mapping] of Object.entries(data.stripeCustomers)) {
    if (mapping.stripeCustomerId === stripeCustomerId) return accountId;
  }
  return null;
}

export function isStripeEventProcessed(stripeEventId: string): boolean {
  return getSnapshot().paymentEvents.some(
    (event) => event.stripeEventId === stripeEventId && event.status === "processed"
  );
}

export async function setStripeCustomerMapping(
  accountId: string,
  stripeCustomerId: string
): Promise<StripeCustomerMapping> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const now = new Date().toISOString();
  const existing = data.stripeCustomers[accountId];
  const mapping: StripeCustomerMapping = {
    accountId,
    stripeCustomerId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.stripeCustomers[accountId] = mapping;
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("setStripeCustomerMapping", () =>
      setStripeCustomerMappingInSupabase(accountId, mapping)
    );
  }

  return mapping;
}

export async function recordStripePaymentEvent(input: {
  stripeEventId: string;
  type: string;
  accountId?: string;
  tierId?: string;
  amountSar?: number;
  currency?: string;
  status?: StripePaymentEventStatus;
  payloadSummary?: Record<string, unknown>;
}): Promise<StripePaymentEvent | null> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const existing = data.paymentEvents.find(
    (item) => item.stripeEventId === input.stripeEventId
  );
  if (existing?.status === "processed" && input.status !== "failed") {
    return existing;
  }

  const event: StripePaymentEvent = existing ?? {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stripeEventId: input.stripeEventId,
    type: input.type,
    accountId: input.accountId,
    tierId: input.tierId,
    amountSar: input.amountSar,
    currency: input.currency ?? "sar",
    status: input.status ?? "received",
    payloadSummary: input.payloadSummary,
    createdAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(event, {
      ...input,
      status: input.status ?? existing.status,
      currency: input.currency ?? existing.currency ?? "sar",
    });
  }

  if (!existing) {
    data.paymentEvents.unshift(event);
  } else {
    data.paymentEvents = data.paymentEvents.map((item) =>
      item.stripeEventId === input.stripeEventId ? event : item
    );
  }
  if (data.paymentEvents.length > 500) {
    data.paymentEvents = data.paymentEvents.slice(0, 500);
  }
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("recordStripePaymentEvent", () =>
      recordStripePaymentEventInSupabase(event)
    );
  }

  return event;
}

export function listStripePaymentEvents(limit = 50): StripePaymentEvent[] {
  return getSnapshot().paymentEvents.slice(0, limit);
}

export async function recordStripeRefund(input: {
  paymentIntentId: string;
  amountSar: number;
  reason?: string;
  requestedBy: string;
  status?: StripeRefundRecord["status"];
}): Promise<StripeRefundRecord> {
  await ensureSubscriptionCacheHydrated();
  const data = getSnapshot();
  const refund: StripeRefundRecord = {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    paymentIntentId: input.paymentIntentId,
    amountSar: input.amountSar,
    reason: input.reason,
    status: input.status ?? "pending",
    requestedBy: input.requestedBy,
    createdAt: new Date().toISOString(),
  };

  data.refunds.unshift(refund);
  setSnapshot({ ...data });

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("recordStripeRefund", () => recordStripeRefundInSupabase(refund));
  }

  return refund;
}

export function listStripeRefunds(limit = 50): StripeRefundRecord[] {
  return getSnapshot().refunds.slice(0, limit);
}

const PLAN_TO_TIER: Record<string, string> = {
  premium_monthly: "premium-user",
  premium_yearly: "premium-user",
  company_standard: "company-standard",
  company_annual: "company-standard",
};

function resolveTierIdForPlan(plan?: string): string | undefined {
  if (!plan) return undefined;
  return planIdToTierId(plan) ?? PLAN_TO_TIER[plan];
}

export async function applyStripeCheckoutCompleted(input: {
  accountId: string;
  plan?: string;
  stripeEventId: string;
  amountSar?: number;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}): Promise<AccountSubscriptionAssignment | null> {
  if (isStripeEventProcessed(input.stripeEventId)) {
    return getAccountAssignment(input.accountId);
  }

  const tierId = resolveTierIdForPlan(input.plan);
  if (!input.accountId || !tierId) return null;

  const now = new Date().toISOString();
  const assignment: AccountSubscriptionAssignment = {
    tierId,
    status: "active",
    startedAt: now,
    expiresAt: input.currentPeriodEnd,
    source: "billing",
    stripeSubscriptionId: input.stripeSubscriptionId,
    checkoutPlanId: input.plan,
  };

  await setAccountAssignment(input.accountId, assignment);
  await syncCompanySubscriptionFromStripe({
    accountId: input.accountId,
    plan: input.plan,
    tierId,
    action: "activate",
    expiresAt: input.currentPeriodEnd,
  });
  await recordStripePaymentEvent({
    stripeEventId: input.stripeEventId,
    type: "checkout.session.completed",
    accountId: input.accountId,
    tierId,
    amountSar: input.amountSar,
    status: "processed",
    payloadSummary: {
      plan: input.plan,
      stripeSubscriptionId: input.stripeSubscriptionId,
    },
  });

  return assignment;
}

export async function applyStripeInvoicePaid(input: {
  accountId: string;
  plan?: string;
  tierId?: string;
  stripeEventId: string;
  amountSar?: number;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}): Promise<AccountSubscriptionAssignment | null> {
  if (isStripeEventProcessed(input.stripeEventId)) {
    return getAccountAssignment(input.accountId);
  }

  const tierId = input.tierId ?? resolveTierIdForPlan(input.plan);
  if (!input.accountId || !tierId) return null;

  const existing = getAccountAssignment(input.accountId);
  const assignment: AccountSubscriptionAssignment = {
    tierId,
    status: "active",
    startedAt: existing?.startedAt ?? new Date().toISOString(),
    expiresAt: input.currentPeriodEnd ?? existing?.expiresAt,
    source: "billing",
    stripeSubscriptionId: input.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
    checkoutPlanId: input.plan ?? existing?.checkoutPlanId,
  };

  await setAccountAssignment(input.accountId, assignment);
  await syncCompanySubscriptionFromStripe({
    accountId: input.accountId,
    plan: input.plan,
    tierId,
    action: "activate",
    expiresAt: input.currentPeriodEnd ?? assignment.expiresAt,
  });
  await recordStripePaymentEvent({
    stripeEventId: input.stripeEventId,
    type: "invoice.paid",
    accountId: input.accountId,
    tierId,
    amountSar: input.amountSar,
    status: "processed",
    payloadSummary: {
      plan: input.plan,
      stripeSubscriptionId: input.stripeSubscriptionId,
      renewal: true,
    },
  });

  return assignment;
}

export async function applyStripeSubscriptionUpdated(input: {
  accountId: string;
  stripeEventId: string;
  status: "active" | "cancelled" | "past_due" | "expired";
  currentPeriodEnd?: string;
  stripeSubscriptionId?: string;
  plan?: string;
  tierId?: string;
}): Promise<AccountSubscriptionAssignment | null> {
  if (isStripeEventProcessed(input.stripeEventId)) {
    return getAccountAssignment(input.accountId);
  }

  const existing = getAccountAssignment(input.accountId);
  if (!existing) return null;

  const tierId = input.tierId ?? resolveTierIdForPlan(input.plan) ?? existing.tierId;
  const assignment: AccountSubscriptionAssignment = {
    ...existing,
    tierId,
    status: input.status === "past_due" ? "active" : input.status,
    expiresAt: input.currentPeriodEnd ?? existing.expiresAt,
    stripeSubscriptionId: input.stripeSubscriptionId ?? existing.stripeSubscriptionId,
    checkoutPlanId: input.plan ?? existing.checkoutPlanId,
  };

  await setAccountAssignment(input.accountId, assignment);

  if (input.status === "expired" || input.status === "cancelled") {
    await syncCompanySubscriptionFromStripe({
      accountId: input.accountId,
      tierId: existing.tierId,
      action: "expire",
    });
  } else if (input.status === "active" && input.currentPeriodEnd) {
    await syncCompanySubscriptionFromStripe({
      accountId: input.accountId,
      tierId: existing.tierId,
      action: "activate",
      expiresAt: input.currentPeriodEnd,
    });
  }

  await recordStripePaymentEvent({
    stripeEventId: input.stripeEventId,
    type: "customer.subscription.updated",
    accountId: input.accountId,
    tierId,
    status: "processed",
    payloadSummary: {
      subscriptionStatus: input.status,
      plan: input.plan,
    },
  });

  return assignment;
}

export async function applyStripeInvoicePaymentFailed(input: {
  accountId: string;
  stripeEventId: string;
  invoiceId?: string;
  amountSar?: number;
  subscriptionId?: string;
  plan?: string;
  tierId?: string;
}): Promise<void> {
  if (isStripeEventProcessed(input.stripeEventId)) return;

  const existing = getAccountAssignment(input.accountId);
  const tierId = input.tierId ?? resolveTierIdForPlan(input.plan) ?? existing?.tierId;

  await recordStripePaymentEvent({
    stripeEventId: input.stripeEventId,
    type: "invoice.payment_failed",
    accountId: input.accountId,
    tierId,
    amountSar: input.amountSar,
    status: "failed",
    payloadSummary: {
      invoiceId: input.invoiceId,
      subscriptionId: input.subscriptionId,
      billingStatus: "past_due",
      plan: input.plan,
    },
  });
}

export async function applyStripeSubscriptionCancelled(
  accountId: string,
  stripeEventId: string
): Promise<void> {
  if (isStripeEventProcessed(stripeEventId)) return;

  const existing = getAccountAssignment(accountId);
  if (!existing) return;

  await setAccountAssignment(accountId, {
    ...existing,
    status: "cancelled",
  });

  await syncCompanySubscriptionFromStripe({
    accountId,
    tierId: existing.tierId,
    action: "expire",
  });

  await recordStripePaymentEvent({
    stripeEventId,
    type: "customer.subscription.deleted",
    accountId,
    status: "processed",
  });
}

export function isSubscriptionPersistenceActive(): boolean {
  return subscriptionTableAvailable;
}

export function getSubscriptionSnapshotStats(): {
  tierCount: number;
  assignmentCount: number;
  overrideCount: number;
  stripeCustomerCount: number;
  paymentEventCount: number;
  expiredActive: string[];
  stripeCustomersWithoutAssignment: string[];
} {
  const data = getSnapshot();
  const now = Date.now();

  const expiredActive = Object.entries(data.assignments)
    .filter(
      ([, assignment]) =>
        assignment.status === "active" &&
        assignment.expiresAt &&
        new Date(assignment.expiresAt).getTime() < now
    )
    .map(([accountId]) => accountId);

  const stripeCustomersWithoutAssignment = Object.keys(data.stripeCustomers).filter(
    (accountId) => !data.assignments[accountId]
  );

  return {
    tierCount: data.tiers.length,
    assignmentCount: Object.keys(data.assignments).length,
    overrideCount: Object.keys(data.overrides).length,
    stripeCustomerCount: Object.keys(data.stripeCustomers).length,
    paymentEventCount: data.paymentEvents.length,
    expiredActive,
    stripeCustomersWithoutAssignment,
  };
}
