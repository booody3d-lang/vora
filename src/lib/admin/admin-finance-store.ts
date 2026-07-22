import "server-only";

import {
  getAdminFinanceSummary,
  isWalletPersistenceActive,
  listAdminFinanceTransactions,
  listAdminWithdrawals,
  reviewWithdrawalRequest,
} from "@/lib/billing/wallet-store";
import type { AdminFinanceMetrics } from "@/lib/billing/billing-supabase";
import type { AdminTransaction } from "@/types/admin";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types/billing";

export interface AdminFinanceSnapshot {
  summary: AdminFinanceMetrics;
  transactions: AdminTransaction[];
  withdrawals: WithdrawalRequest[];
  persistence: "supabase" | "demo";
}

export async function getAdminFinanceSnapshot(limit = 50): Promise<AdminFinanceSnapshot> {
  const [summary, transactions, withdrawals] = await Promise.all([
    getAdminFinanceSummary(),
    listAdminFinanceTransactions(limit),
    listAdminWithdrawals(limit),
  ]);

  return {
    summary,
    transactions,
    withdrawals,
    persistence: isWalletPersistenceActive() ? "supabase" : "demo",
  };
}

export async function reviewAdminWithdrawal(
  withdrawalId: string,
  status: Extract<WithdrawalStatus, "approved" | "rejected" | "completed">,
  reviewedBy: string,
  adminNotes?: string
): Promise<WithdrawalRequest> {
  return reviewWithdrawalRequest(withdrawalId, status, reviewedBy, adminNotes);
}

export function isAdminFinancePersistenceActive(): boolean {
  return isWalletPersistenceActive();
}
