import { NextResponse } from "next/server";
import { getAccountInvoice } from "@/lib/billing/wallet-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const { id } = await params;
  const invoice = await getAccountInvoice(authResult.auth.user.id, id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
