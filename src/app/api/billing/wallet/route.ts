import { NextResponse } from "next/server";
import {
  getAccountWallet,
  getAccountWalletTransactions,
  isWalletPersistenceActive,
} from "@/lib/billing/wallet-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const accountId = authResult.auth.user.id;
  const [wallet, transactions] = await Promise.all([
    getAccountWallet(accountId),
    getAccountWalletTransactions(accountId),
  ]);

  return NextResponse.json({
    wallet,
    transactions,
    persistence: isWalletPersistenceActive() ? "supabase" : "demo",
  });
}
