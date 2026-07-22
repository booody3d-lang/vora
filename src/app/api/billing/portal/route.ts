import { NextResponse } from "next/server";
import { getServerStripe } from "@/lib/billing/stripe-server";
import {
  ensureSubscriptionCacheHydrated,
  getStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const stripe = getServerStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  await ensureSubscriptionCacheHydrated();
  const accountId = authResult.auth.user.id;
  const mapping = getStripeCustomerMapping(accountId);
  if (!mapping?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found. Subscribe to a plan first." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { returnUrl?: string };
    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: mapping.stripeCustomerId,
      return_url: body.returnUrl ?? `${origin}/billing/plans`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing/portal]", error);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
