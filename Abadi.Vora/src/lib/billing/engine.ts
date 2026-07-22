import {
  PLATFORM_COMMISSION_RATE,
  type CommissionSplit,
  type Invoice,
  type InvoiceLineItem,
  type TriWallet,
  type UserSubscription,
  type WalletTransaction,
  type WithdrawalRequest,
  MIN_WITHDRAWAL_SAR,
} from "@/types/billing";

export function calculateCommission(orderTotal: number): CommissionSplit {
  const platformCommission = Math.round(orderTotal * PLATFORM_COMMISSION_RATE * 100) / 100;
  const freelancerNetEarnings = Math.round((orderTotal - platformCommission) * 100) / 100;
  return {
    orderTotal,
    platformCommission,
    freelancerNetEarnings,
    commissionRate: PLATFORM_COMMISSION_RATE,
  };
}

export function formatSar(amount: number): string {
  return `SR ${amount.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function canWithdraw(amount: number, availableBalance: number): {
  allowed: boolean;
  reason?: string;
} {
  if (amount < MIN_WITHDRAWAL_SAR) {
    return { allowed: false, reason: `Minimum withdrawal is SR ${MIN_WITHDRAWAL_SAR}` };
  }
  if (amount > availableBalance) {
    return { allowed: false, reason: "Insufficient available balance" };
  }
  return { allowed: true };
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `VORA-INV-${y}${m}-${seq}`;
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function buildMarketplaceInvoice(
  orderTotal: number,
  serviceTitle: string,
  buyerName: string
): Omit<Invoice, "id"> {
  const split = calculateCommission(orderTotal);
  const lineItems: InvoiceLineItem[] = [
    { description: serviceTitle, quantity: 1, unitPrice: orderTotal, total: orderTotal },
    { description: "VORA Platform Commission (10%)", quantity: 1, unitPrice: -split.platformCommission, total: -split.platformCommission },
  ];
  return {
    invoiceNumber: generateInvoiceNumber(),
    type: "marketplace_purchase",
    subtotal: orderTotal,
    taxAmount: 0,
    total: orderTotal,
    currency: "SAR",
    lineItems,
    transactionId: generateTransactionId(),
    issuedAt: new Date().toISOString(),
  };
}

export function buildSubscriptionInvoice(
  planName: string,
  amount: number,
  companyDetails?: { name: string; taxId: string; address: string }
): Omit<Invoice, "id"> {
  const lineItems: InvoiceLineItem[] = [
    { description: planName, quantity: 1, unitPrice: amount, total: amount },
  ];
  const taxAmount = companyDetails ? Math.round(amount * 0.15 * 100) / 100 : 0;
  return {
    invoiceNumber: generateInvoiceNumber(),
    type: "subscription",
    subtotal: amount,
    taxAmount,
    total: amount + taxAmount,
    currency: "SAR",
    lineItems,
    transactionId: generateTransactionId(),
    companyTaxId: companyDetails?.taxId,
    companyName: companyDetails?.name,
    companyAddress: companyDetails?.address,
    issuedAt: new Date().toISOString(),
  };
}

export function isPremiumUser(sub: UserSubscription): boolean {
  return (
    sub.isPremium &&
    sub.status === "active" &&
    (sub.plan === "premium_monthly" || sub.plan === "premium_yearly")
  );
}

// Demo data
export const DEMO_WALLET: TriWallet = {
  pendingBalance: 1347.0,
  availableBalance: 8920.5,
  withdrawnTotal: 24600.0,
  currency: "SAR",
};

export const DEMO_SUBSCRIPTION: UserSubscription = {
  plan: "free",
  status: "active",
  isPremium: false,
};

export const DEMO_TRANSACTIONS: WalletTransaction[] = [
  { id: "wt1", type: "order_escrow", ledger: "pending", amount: 449, currency: "SAR", description: "Order VORA-2026-7842 — Logo Design", descriptionAr: "طلب VORA-2026-7842 — تصميم شعار", createdAt: "2026-07-15T10:01:00Z" },
  { id: "wt2", type: "order_release", ledger: "available", amount: 269.1, currency: "SAR", description: "Order completed — net earnings (90%)", descriptionAr: "اكتمل الطلب — صافي الأرباح (90%)", createdAt: "2026-07-14T16:00:00Z" },
  { id: "wt3", type: "platform_commission", ledger: "available", amount: 29.9, currency: "SAR", description: "VORA 10% commission", descriptionAr: "عمولة VORA 10%", createdAt: "2026-07-14T16:00:00Z" },
  { id: "wt4", type: "withdrawal_completed", ledger: "withdrawn", amount: 5000, currency: "SAR", description: "Withdrawal to SA03 8000 0000 6080 1016 7519", descriptionAr: "سحب إلى SA03 8000 0000 6080 1016 7519", createdAt: "2026-07-01T09:00:00Z" },
];

export const DEMO_WITHDRAWALS: WithdrawalRequest[] = [
  { id: "wd1", amount: 2500, iban: "SA03 8000 0000 6080 1016 7519", bankName: "Al Rajhi Bank", accountHolder: "Alex Morgan", status: "pending_review", createdAt: "2026-07-16T14:00:00Z" },
];

export const DEMO_INVOICES: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "VORA-INV-202607-00142",
    type: "marketplace_purchase",
    subtotal: 299,
    taxAmount: 0,
    total: 299,
    currency: "SAR",
    lineItems: [
      { description: "Professional Logo Design", descriptionAr: "تصميم شعار احترافي", quantity: 1, unitPrice: 299, total: 299 },
    ],
    transactionId: "TXN-20260715-A3F2B1",
    issuedAt: "2026-07-15T10:01:00Z",
  },
  {
    id: "inv2",
    invoiceNumber: "VORA-INV-202606-00089",
    type: "subscription",
    subtotal: 600,
    taxAmount: 90,
    total: 690,
    currency: "SAR",
    lineItems: [{ description: "VORA Company Annual Plan", descriptionAr: "خطة VORA السنوية للشركات", quantity: 1, unitPrice: 600, total: 600 }],
    transactionId: "TXN-20260601-C7D4E9",
    companyName: "TechCorp Global",
    companyTaxId: "310123456700003",
    companyAddress: "Dubai Internet City, UAE",
    issuedAt: "2026-06-01T08:00:00Z",
  },
];
