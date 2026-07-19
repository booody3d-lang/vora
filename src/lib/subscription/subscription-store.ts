import "server-only";

import fs from "fs";
import path from "path";
import type {
  AccountSubscriptionAssignment,
  ManualSubscriptionOverride,
  SubscriptionTier,
} from "@/types/subscription";

const DATA_DIR = path.join(process.cwd(), ".data", "vora");
const DATA_FILE = path.join(DATA_DIR, "subscription-data.json");

// ─── Stripe payment-ready scaffolding ───────────────────────────────────────

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

interface SubscriptionDataFile {
  tiers: SubscriptionTier[];
  assignments: Record<string, AccountSubscriptionAssignment>;
  overrides: Record<string, ManualSubscriptionOverride>;
  stripeCustomers: Record<string, StripeCustomerMapping>;
  paymentEvents: StripePaymentEvent[];
  refunds: StripeRefundRecord[];
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

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): SubscriptionDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: SubscriptionDataFile = {
      tiers: defaultTiers(),
      assignments: {},
      overrides: {},
      stripeCustomers: {},
      paymentEvents: [],
      refunds: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as SubscriptionDataFile;
  if (!data.tiers?.length) data.tiers = defaultTiers();
  if (!data.assignments) data.assignments = {};
  if (!data.overrides) data.overrides = {};
  if (!data.stripeCustomers) data.stripeCustomers = {};
  if (!data.paymentEvents) data.paymentEvents = [];
  if (!data.refunds) data.refunds = [];
  return data;
}

function writeData(data: SubscriptionDataFile) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function listSubscriptionTiers(audience?: SubscriptionTier["audience"]): SubscriptionTier[] {
  const data = readData();
  return data.tiers
    .filter((t) => t.isActive || !audience)
    .filter((t) => !audience || t.audience === audience)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubscriptionTier(tierId: string): SubscriptionTier | null {
  return readData().tiers.find((t) => t.id === tierId) ?? null;
}

export function createSubscriptionTier(
  input: Omit<SubscriptionTier, "id" | "createdAt" | "updatedAt" | "sortOrder"> & {
    sortOrder?: number;
  }
): SubscriptionTier {
  const data = readData();
  const now = new Date().toISOString();
  const tier: SubscriptionTier = {
    ...input,
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sortOrder: input.sortOrder ?? data.tiers.length,
    createdAt: now,
    updatedAt: now,
  };
  data.tiers.push(tier);
  writeData(data);
  return tier;
}

export function updateSubscriptionTier(
  tierId: string,
  patch: Partial<Omit<SubscriptionTier, "id" | "createdAt">>
): SubscriptionTier | null {
  const data = readData();
  const index = data.tiers.findIndex((t) => t.id === tierId);
  if (index < 0) return null;
  data.tiers[index] = {
    ...data.tiers[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.tiers[index];
}

export function deleteSubscriptionTier(tierId: string): boolean {
  const data = readData();
  const before = data.tiers.length;
  data.tiers = data.tiers.filter((t) => t.id !== tierId);
  if (data.tiers.length === before) return false;
  writeData(data);
  return true;
}

export function getAccountAssignment(accountId: string): AccountSubscriptionAssignment | null {
  return readData().assignments[accountId] ?? null;
}

export function setAccountAssignment(
  accountId: string,
  assignment: AccountSubscriptionAssignment
): AccountSubscriptionAssignment {
  const data = readData();
  data.assignments[accountId] = assignment;
  writeData(data);
  return assignment;
}

export function getManualOverride(accountId: string): ManualSubscriptionOverride | null {
  return readData().overrides[accountId] ?? null;
}

export function setManualOverride(
  accountId: string,
  override: ManualSubscriptionOverride
): ManualSubscriptionOverride {
  const data = readData();
  data.overrides[accountId] = override;
  writeData(data);
  return override;
}

export function removeManualOverride(accountId: string): boolean {
  const data = readData();
  if (!data.overrides[accountId]) return false;
  delete data.overrides[accountId];
  writeData(data);
  return true;
}

export function getAllOverrides(): Record<string, ManualSubscriptionOverride> {
  return readData().overrides;
}

export function getStripeCustomerMapping(accountId: string): StripeCustomerMapping | null {
  return readData().stripeCustomers[accountId] ?? null;
}

export function setStripeCustomerMapping(
  accountId: string,
  stripeCustomerId: string
): StripeCustomerMapping {
  const data = readData();
  const now = new Date().toISOString();
  const existing = data.stripeCustomers[accountId];
  const mapping: StripeCustomerMapping = {
    accountId,
    stripeCustomerId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.stripeCustomers[accountId] = mapping;
  writeData(data);
  return mapping;
}

export function recordStripePaymentEvent(input: {
  stripeEventId: string;
  type: string;
  accountId?: string;
  tierId?: string;
  amountSar?: number;
  currency?: string;
  status?: StripePaymentEventStatus;
  payloadSummary?: Record<string, unknown>;
}): StripePaymentEvent {
  const data = readData();
  const event: StripePaymentEvent = {
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
  data.paymentEvents.unshift(event);
  if (data.paymentEvents.length > 500) {
    data.paymentEvents = data.paymentEvents.slice(0, 500);
  }
  writeData(data);
  return event;
}

export function listStripePaymentEvents(limit = 50): StripePaymentEvent[] {
  return readData().paymentEvents.slice(0, limit);
}

export function recordStripeRefund(input: {
  paymentIntentId: string;
  amountSar: number;
  reason?: string;
  requestedBy: string;
  status?: StripeRefundRecord["status"];
}): StripeRefundRecord {
  const data = readData();
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
  writeData(data);
  return refund;
}

export function listStripeRefunds(limit = 50): StripeRefundRecord[] {
  return readData().refunds.slice(0, limit);
}

const PLAN_TO_TIER: Record<string, string> = {
  premium_monthly: "premium-user",
  premium_yearly: "premium-user",
  company_standard: "company-standard",
};

export function applyStripeCheckoutCompleted(input: {
  accountId: string;
  plan?: string;
  stripeEventId: string;
  amountSar?: number;
}): AccountSubscriptionAssignment | null {
  const tierId = input.plan ? PLAN_TO_TIER[input.plan] : undefined;
  if (!input.accountId || !tierId) return null;

  const now = new Date().toISOString();
  const assignment: AccountSubscriptionAssignment = {
    tierId,
    status: "active",
    startedAt: now,
    source: "billing",
  };

  setAccountAssignment(input.accountId, assignment);
  recordStripePaymentEvent({
    stripeEventId: input.stripeEventId,
    type: "checkout.session.completed",
    accountId: input.accountId,
    tierId,
    amountSar: input.amountSar,
    status: "processed",
    payloadSummary: { plan: input.plan },
  });

  return assignment;
}

export function applyStripeSubscriptionCancelled(accountId: string, stripeEventId: string): void {
  const existing = getAccountAssignment(accountId);
  if (!existing) return;

  setAccountAssignment(accountId, {
    ...existing,
    status: "cancelled",
  });

  recordStripePaymentEvent({
    stripeEventId,
    type: "customer.subscription.deleted",
    accountId,
    status: "processed",
  });
}
