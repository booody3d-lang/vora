import { NextResponse } from "next/server";
import { getServerStripe } from "@/lib/billing/stripe-server";
import { listStripePaymentEvents, listStripeRefunds, recordStripeRefund } from "@/lib/subscription/subscription-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  return NextResponse.json({
    payments: listStripePaymentEvents(100),
    refunds: listStripeRefunds(100),
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      paymentIntentId?: string;
      amountSar?: number;
      reason?: string;
    };

    if (!body.paymentIntentId || !body.amountSar) {
      return NextResponse.json(
        { error: "paymentIntentId and amountSar are required" },
        { status: 400 }
      );
    }

    const refundRecord = recordStripeRefund({
      paymentIntentId: body.paymentIntentId,
      amountSar: body.amountSar,
      reason: body.reason,
      requestedBy: auth.user.id,
      status: "pending",
    });

    const stripe = getServerStripe();
    if (stripe) {
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: body.paymentIntentId,
          amount: Math.round(body.amountSar * 100),
          reason: "requested_by_customer",
          metadata: {
            requested_by: auth.user.email,
            vora_refund_id: refundRecord.id,
          },
        });
        refundRecord.status = stripeRefund.status === "succeeded" ? "succeeded" : "pending";
      } catch (error) {
        console.error("[stripe/refund]", error);
        refundRecord.status = "failed";
      }
    }

    return NextResponse.json({ ok: true, refund: refundRecord, stripeReady: Boolean(stripe) });
  } catch {
    return NextResponse.json({ error: "Failed to initiate refund" }, { status: 500 });
  }
}
