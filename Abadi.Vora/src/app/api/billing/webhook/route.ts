import { NextResponse } from "next/server";
import { getServerStripe, resolveStripeWebhookSecret } from "@/lib/billing/stripe-server";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { PLAN_AMOUNTS, subscriptionPaymentAlert } from "@/lib/notifications/triggers";
import {
  applyStripeCheckoutCompleted,
  applyStripeSubscriptionCancelled,
  recordStripePaymentEvent,
  setStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getServerStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = resolveStripeWebhookSecret();

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan ?? "";
      const accountId = session.metadata?.account_id ?? "";
      const planInfo = PLAN_AMOUNTS[plan];
      const amountSar = planInfo?.amount ?? (session.amount_total ? session.amount_total / 100 : undefined);

      if (accountId && typeof session.customer === "string") {
        setStripeCustomerMapping(accountId, session.customer);
      }

      applyStripeCheckoutCompleted({
        accountId,
        plan,
        stripeEventId: event.id,
        amountSar,
      });

      if (planInfo) {
        const alert = subscriptionPaymentAlert(
          planInfo.label,
          planInfo.amount,
          (session.customer_details?.name ?? accountId) || "User"
        );
        await serverDispatchNotification(alert, { ownerEmail: true });
      }

      console.info("Checkout completed:", plan, accountId);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      recordStripePaymentEvent({
        stripeEventId: event.id,
        type: event.type,
        accountId: invoice.metadata?.account_id,
        amountSar: invoice.amount_paid ? invoice.amount_paid / 100 : undefined,
        status: "processed",
        payloadSummary: { invoiceId: invoice.id },
      });
      console.info("Invoice paid:", invoice.id, invoice.amount_paid);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = subscription.metadata?.account_id ?? "";
      if (accountId) {
        applyStripeSubscriptionCancelled(accountId, event.id);
      }
      console.info("Subscription cancelled:", subscription.id);
      break;
    }
    default:
      recordStripePaymentEvent({
        stripeEventId: event.id,
        type: event.type,
        status: "received",
      });
      break;
  }

  return NextResponse.json({ received: true });
}
