import { NextResponse } from "next/server";
import { ADMIN_RECENT_TRANSACTIONS } from "@/lib/admin/mock-data";
import {
  getAdminFinanceSummary,
  isWalletPersistenceActive,
  listAdminWithdrawals,
} from "@/lib/billing/wallet-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const [summaryData, withdrawals] = await Promise.all([
    getAdminFinanceSummary(),
    listAdminWithdrawals(),
  ]);

  const summary = isWalletPersistenceActive()
    ? {
        totalEscrow: summaryData.totalPending,
        availablePayouts: summaryData.totalAvailable,
        totalWithdrawn: summaryData.totalWithdrawn,
        pendingWithdrawals: summaryData.pendingWithdrawals,
      }
    : {
        totalEscrow: summaryData.totalPending,
        availablePayouts: summaryData.totalAvailable,
        totalWithdrawn: summaryData.totalWithdrawn,
        pendingWithdrawals: summaryData.pendingWithdrawals,
      };

  return NextResponse.json({
    summary,
    transactions: ADMIN_RECENT_TRANSACTIONS,
    withdrawals,
    persistence: isWalletPersistenceActive() ? "supabase" : "demo",
  });
}
