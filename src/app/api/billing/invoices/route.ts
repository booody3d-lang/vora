import { NextResponse } from "next/server";
import { getAccountInvoices, isWalletPersistenceActive } from "@/lib/billing/wallet-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const invoices = await getAccountInvoices(authResult.auth.user.id);

  return NextResponse.json({
    invoices,
    persistence: isWalletPersistenceActive() ? "supabase" : "demo",
  });
}
