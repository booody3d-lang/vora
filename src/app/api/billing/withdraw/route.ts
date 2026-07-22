import { NextResponse } from "next/server";
import { canWithdraw } from "@/lib/billing/engine";
import { getAccountWallet, submitWithdrawalRequest } from "@/lib/billing/wallet-store";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { withdrawalRequestAlert } from "@/lib/notifications/triggers";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as {
      amount: number;
      iban: string;
      bankName: string;
      accountHolder: string;
    };

    const wallet = await getAccountWallet(authResult.auth.user.id);
    const validation = canWithdraw(body.amount, wallet.availableBalance);
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    if (!body.iban?.startsWith("SA") || body.iban.replace(/\s/g, "").length < 24) {
      return NextResponse.json({ error: "Invalid Saudi IBAN format" }, { status: 400 });
    }

    const withdrawal = await submitWithdrawalRequest(authResult.auth.user.id, {
      amount: body.amount,
      iban: body.iban,
      bankName: body.bankName,
      accountHolder: body.accountHolder,
    });

    const ibanLast4 = body.iban.replace(/\s/g, "").slice(-4);
    const ownerAlert = withdrawalRequestAlert(
      body.accountHolder,
      body.amount,
      body.bankName,
      ibanLast4
    );
    await serverDispatchNotification(ownerAlert, { ownerEmail: true });

    return NextResponse.json({ success: true, withdrawal, ownerAlert });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create withdrawal request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
