import type { PlanDefinition, SubscriptionPlan } from "@/types/billing";

/** Static checkout catalog metadata — prices and Stripe IDs are resolved from tiers at runtime. */
export interface BillingPlanSpec {
  id: SubscriptionPlan;
  tierId: string;
  nameEn: string;
  nameAr: string;
  priceSar: number;
  interval: PlanDefinition["interval"];
  target: PlanDefinition["target"];
  features: string[];
  featuresAr: string[];
}

export const PLAN_TO_TIER: Record<SubscriptionPlan, string> = {
  free: "free-user",
  premium_monthly: "premium-user",
  premium_yearly: "premium-user",
  company_annual: "company-standard",
};

/** Env var fallbacks when admin has not configured tier Stripe Price IDs yet. */
export const ENV_STRIPE_PRICE_FALLBACKS: Partial<Record<SubscriptionPlan, string | undefined>> = {
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  company_annual: process.env.STRIPE_COMPANY_ANNUAL_PRICE_ID,
};

export const BILLING_PLAN_SPECS: BillingPlanSpec[] = [
  {
    id: "free",
    tierId: "free-user",
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
    tierId: "premium-user",
    nameEn: "Premium Monthly",
    nameAr: "بريميوم شهري",
    priceSar: 20,
    interval: "month",
    target: "individual",
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
    tierId: "premium-user",
    nameEn: "Premium Yearly",
    nameAr: "بريميوم سنوي",
    priceSar: 120,
    interval: "year",
    target: "individual",
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
    tierId: "company-standard",
    nameEn: "Company Annual",
    nameAr: "شركات سنوي",
    priceSar: 600,
    interval: "year",
    target: "company",
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

export function checkoutPlansForTier(tierId: string): SubscriptionPlan[] {
  return BILLING_PLAN_SPECS.filter((spec) => spec.tierId === tierId && spec.id !== "free").map(
    (spec) => spec.id
  );
}

export function billingPlanSpec(planId: SubscriptionPlan): BillingPlanSpec | undefined {
  return BILLING_PLAN_SPECS.find((spec) => spec.id === planId);
}
