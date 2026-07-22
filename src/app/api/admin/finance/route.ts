import { NextResponse } from "next/server";
import {
  getAdminFinanceSummary,
  isWalletPersistenceActive,
  listAdminFinanceTransactions,
  listAdminWithdrawals,
} from "@/lib/billing/wallet-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const [summary, transactions, withdrawals] = await Promise.all([
    getAdminFinanceSummary(),
    listAdminFinanceTransactions(),
    listAdminWithdrawals(),
  ]);

  return NextResponse.json({
    summary,
    transactions,
    withdrawals,
    persistence: isWalletPersistenceActive() ? "supabase" : "demo",
  });
}
