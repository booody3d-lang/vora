import { NextResponse } from "next/server";
import { ADMIN_FINANCIAL_SUMMARY, ADMIN_RECENT_TRANSACTIONS } from "@/lib/admin/mock-data";
import { DEMO_WITHDRAWALS } from "@/lib/billing/engine";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  return NextResponse.json({
    summary: ADMIN_FINANCIAL_SUMMARY,
    transactions: ADMIN_RECENT_TRANSACTIONS,
    withdrawals: DEMO_WITHDRAWALS,
  });
}
