import { NextResponse } from "next/server";
import { canWithdraw } from "@/lib/billing/engine";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { withdrawalRequestAlert } from "@/lib/notifications/triggers";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      accountId: string;
      amount: number;
      iban: string;
      bankName: string;
      accountHolder: string;
      availableBalance: number;
    };

    const validation = canWithdraw(body.amount, body.availableBalance);
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    if (!body.iban?.startsWith("SA") || body.iban.replace(/\s/g, "").length < 24) {
      return NextResponse.json({ error: "Invalid Saudi IBAN format" }, { status: 400 });
    }

    // In production: deduct from available_balance, insert withdrawal_requests row
    const withdrawal = {
      id: `wd-${Date.now()}`,
      accountId: body.accountId,
      amount: body.amount,
      iban: body.iban,
      bankName: body.bankName,
      accountHolder: body.accountHolder,
      status: "pending_review" as const,
      createdAt: new Date().toISOString(),
    };

    const ibanLast4 = body.iban.replace(/\s/g, "").slice(-4);
    const ownerAlert = withdrawalRequestAlert(
      body.accountHolder,
      body.amount,
      body.bankName,
      ibanLast4
    );
    await serverDispatchNotification(ownerAlert, { ownerEmail: true });

    return NextResponse.json({ success: true, withdrawal, ownerAlert });
  } catch {
    return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 });
  }
}
