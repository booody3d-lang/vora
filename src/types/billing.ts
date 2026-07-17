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

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    nameEn: "Free",
    nameAr: "مجاني",
    priceSar: 0,
    interval: "none",
    target: "individual",
    features: [
      "Full VORA Network access",
      "Connections & content creation",
      "Freelancer Store creation",
      "Buy & sell marketplace services",
    ],
    featuresAr: [
      "وصول كامل لشبكة VORA",
      "بناء العلاقات وإنشاء المحتوى",
      "إنشاء متجر Freelance",
      "شراء وبيع الخدمات",
    ],
  },
  {
    id: "premium_monthly",
    nameEn: "Premium Monthly",
    nameAr: "بريميوم شهري",
    priceSar: 20,
    interval: "month",
    target: "individual",
    stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    features: [
      "Premium Badge on profile & store",
      "Higher search visibility",
      "Profile Visitors Analytics (full)",
      "VORA AI: Profile Optimization & Resume Review",
    ],
    featuresAr: [
      "شارة Premium على الملف والمتجر",
      "ظهور أعلى في نتائج البحث",
      "تحليلات زوار الملف (كامل)",
      "VORA AI: تحسين الملف ومراجعة السيرة",
    ],
  },
  {
    id: "premium_yearly",
    nameEn: "Premium Yearly",
    nameAr: "بريميوم سنوي",
    priceSar: 120,
    interval: "year",
    target: "individual",
    stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    features: [
      "All Premium Monthly benefits",
      "Save 50% vs monthly billing",
      "Priority support",
    ],
    featuresAr: [
      "جميع مميزات البريميوم الشهري",
      "توفير 50% مقارنة بالشهري",
      "دعم أولوية",
    ],
  },
  {
    id: "company_annual",
    nameEn: "Company Annual",
    nameAr: "شركات سنوي",
    priceSar: 600,
    interval: "year",
    target: "company",
    stripePriceId: process.env.STRIPE_COMPANY_ANNUAL_PRICE_ID,
    features: [
      "Unlimited job postings",
      "Full ATS Drag-and-Drop Pipeline",
      "Video Application Screening",
      "Company Analytics Dashboard",
    ],
    featuresAr: [
      "وظائف غير محدودة",
      "نظام ATS كامل",
      "مراجعة الفيدio للمتقدمين",
      "لوحة تحليلات الشركة",
    ],
  },
];
