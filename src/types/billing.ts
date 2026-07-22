import { BILLING_PLAN_SPECS, ENV_STRIPE_PRICE_FALLBACKS } from "@/lib/billing/plan-catalog";

export type SubscriptionPlan = "free" | "premium_monthly" | "premium_yearly" | "company_annual";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired";
export type WalletLedgerType = "pending" | "available" | "withdrawn";
export type TransactionType =
  | "order_escrow"
  | "order_release"
  | "platform_commission"
  | "subscription_payment"
  | "withdrawal"
  | "withdrawal_completed"
  | "refund";
export type WithdrawalStatus = "pending_review" | "approved" | "rejected" | "completed";
export type InvoiceType = "subscription" | "marketplace_purchase" | "commission" | "withdrawal";

export interface PlanDefinition {
  id: SubscriptionPlan;
  tierId: string;
  nameEn: string;
  nameAr: string;
  priceSar: number;
  interval: "month" | "year" | "none";
  target: "individual" | "company";
  features: string[];
  featuresAr: string[];
  stripePriceId?: string;
}

export interface TriWallet {
  pendingBalance: number;
  availableBalance: number;
  withdrawnTotal: number;
  currency: "SAR";
}

export interface CommissionSplit {
  orderTotal: number;
  platformCommission: number;
  freelancerNetEarnings: number;
  commissionRate: number;
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  ledger: WalletLedgerType;
  amount: number;
  currency: string;
  description: string;
  descriptionAr?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  iban: string;
  bankName: string;
  accountHolder: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  transactionId: string;
  companyTaxId?: string;
  companyName?: string;
  companyAddress?: string;
  issuedAt: string;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  isPremium: boolean;
}

export const PLATFORM_COMMISSION_RATE = 0.1;
export const MIN_WITHDRAWAL_SAR = 50;
export const CURRENCY = "SAR" as const;

/** Static fallback catalog — prefer live plans from `/api/billing/plans`. */
export const PLANS: PlanDefinition[] = BILLING_PLAN_SPECS.map((spec) => ({
  id: spec.id,
  tierId: spec.tierId,
  nameEn: spec.nameEn,
  nameAr: spec.nameAr,
  priceSar: spec.priceSar,
  interval: spec.interval,
  target: spec.target,
  features: spec.features,
  featuresAr: spec.featuresAr,
  stripePriceId: ENV_STRIPE_PRICE_FALLBACKS[spec.id],
}));
