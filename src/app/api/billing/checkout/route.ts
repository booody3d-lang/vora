import { NextResponse } from "next/server";
import { getStripe, getPlanStripePriceId, STRIPE_CONFIG } from "@/lib/billing/stripe";
import type { SubscriptionPlan } from "@/types/billing";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      plan: SubscriptionPlan;
      accountId: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured. Set STRIPE_SECRET_KEY in environment." },
        { status: 503 }
      );
    }

    const priceId = getPlanStripePriceId(body.plan);
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe price ID" }, { status: 400 });
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: STRIPE_CONFIG.paymentMethodTypes,
      line_items: [{ price: priceId, quantity: 1 }],
      currency: STRIPE_CONFIG.currency,
      success_url: body.successUrl ?? `${origin}/billing/plans?success=true`,
      cancel_url: body.cancelUrl ?? `${origin}/billing/plans?cancelled=true`,
      metadata: {
        account_id: body.accountId,
        plan: body.plan,
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
