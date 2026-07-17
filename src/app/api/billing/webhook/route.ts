import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { PLAN_AMOUNTS, subscriptionPaymentAlert } from "@/lib/notifications/triggers";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan ?? "";
      const planInfo = PLAN_AMOUNTS[plan];
      if (planInfo) {
        const alert = subscriptionPaymentAlert(
          planInfo.label,
          planInfo.amount,
          session.customer_details?.name ?? session.metadata?.account_id ?? "User"
        );
        await serverDispatchNotification(alert, { ownerEmail: true });
      }
      console.info("Checkout completed:", session.metadata?.plan, session.metadata?.account_id);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      console.info("Invoice paid:", invoice.id, invoice.amount_paid);
      break;
    }
    case "customer.subscription.deleted": {
      console.info("Subscription cancelled:", event.data.object);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
