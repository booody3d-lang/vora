import { NextResponse } from "next/server";
import {
  planIdToTierId,
  resolveTierAndPlanFromStripePriceId,
} from "@/lib/billing/resolve-plans";
import { getServerStripe, resolveStripeWebhookSecret } from "@/lib/billing/stripe-server";
import { createSubscriptionInvoice } from "@/lib/billing/wallet-store";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import {
  buildTriggerNotification,
  PLAN_AMOUNTS,
  subscriptionPaymentAlert,
} from "@/lib/notifications/triggers";
import {
  applyStripeCheckoutCompleted,
  applyStripeInvoicePaid,
  applyStripeSubscriptionCancelled,
  applyStripeSubscriptionUpdated,
  ensureSubscriptionCacheHydrated,
  findAccountIdByStripeCustomerId,
  isStripeEventProcessed,
  listSubscriptionTiers,
  recordStripePaymentEvent,
  setStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import type { SubscriptionPlan } from "@/types/billing";
import Stripe from "stripe";

function periodEndIso(subscription: Stripe.Subscription): string | undefined {
  const end = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (!end) return undefined;
  return new Date(end * 1000).toISOString();
}

async function resolveSubscriptionContext(
  stripe: Stripe,
  subscriptionRef: string | Stripe.Subscription | null | undefined
): Promise<{
  subscription: Stripe.Subscription | null;
  accountId: string;
  plan?: SubscriptionPlan;
  tierId?: string;
}> {
  if (!subscriptionRef) {
    return { subscription: null, accountId: "" };
  }

  const subscription =
    typeof subscriptionRef === "string"
      ? await stripe.subscriptions.retrieve(subscriptionRef)
      : subscriptionRef;

  let accountId = subscription.metadata?.account_id ?? "";
  let plan = subscription.metadata?.plan as SubscriptionPlan | undefined;
  let tierId: string | undefined = subscription.metadata?.tier_id;

  if (!accountId && typeof subscription.customer === "string") {
    accountId = findAccountIdByStripeCustomerId(subscription.customer) ?? "";
  }

  if (!plan || !tierId) {
    await ensureSubscriptionCacheHydrated();
    const tiers = listSubscriptionTiers();
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId) {
      const resolved = resolveTierAndPlanFromStripePriceId(priceId, tiers);
      if (resolved) {
        plan = plan ?? resolved.planId;
        tierId = tierId ?? resolved.tierId;
      }
    }
  }

  if (!tierId && plan) {
    tierId = planIdToTierId(plan);
  }

  return { subscription, accountId, plan, tierId };
}

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

  await ensureSubscriptionCacheHydrated();

  if (isStripeEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan ?? "";
      const accountId = session.metadata?.account_id ?? "";
      const planInfo = PLAN_AMOUNTS[plan];
      const amountSar = planInfo?.amount ?? (session.amount_total ? session.amount_total / 100 : undefined);
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (accountId && typeof session.customer === "string") {
        await setStripeCustomerMapping(accountId, session.customer);
      }

      let currentPeriodEnd: string | undefined;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = periodEndIso(subscription);
      }

      await applyStripeCheckoutCompleted({
        accountId,
        plan,
        stripeEventId: event.id,
        amountSar,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd,
      });

      if (planInfo && accountId) {
        const alert = subscriptionPaymentAlert(
          planInfo.label,
          planInfo.amount,
          (session.customer_details?.name ?? accountId) || "User"
        );
        await serverDispatchNotification(alert, { ownerEmail: true });

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        const invoice = await createSubscriptionInvoice(accountId, {
          planName: planInfo.label,
          amount: planInfo.amount,
          stripePaymentIntentId: paymentIntentId,
        });

        const userReceipt = buildTriggerNotification({
          trigger: "subscription_payment",
          title: `Payment confirmed — ${planInfo.label}`,
          titleAr: `تم تأكيد الدفع — ${planInfo.label}`,
          body: `Your ${planInfo.label} subscription is active. Invoice ${invoice.invoiceNumber} for SR ${planInfo.amount}.`,
          bodyAr: `اشتراكك في ${planInfo.label} مفعّل. فاتورة ${invoice.invoiceNumber} بمبلغ ${planInfo.amount} ر.س.`,
          amountSar: planInfo.amount,
          href: `/billing/invoices/${invoice.id}`,
          channels: ["in_app", "email"],
        });
        await serverDispatchNotification(userReceipt, { accountId, ownerEmail: false });
      } else if (planInfo) {
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
      const amountSar = invoice.amount_paid ? invoice.amount_paid / 100 : undefined;

      if (invoice.billing_reason === "subscription_create") {
        await recordStripePaymentEvent({
          stripeEventId: event.id,
          type: event.type,
          accountId: invoice.metadata?.account_id,
          amountSar,
          status: "processed",
          payloadSummary: { invoiceId: invoice.id, skipped: "handled_by_checkout" },
        });
        break;
      }

      const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
        .subscription;

      const { subscription, accountId, plan, tierId } = await resolveSubscriptionContext(
        stripe,
        subscriptionRef
      );

      if (accountId && (plan || tierId)) {
        await applyStripeInvoicePaid({
          accountId,
          plan,
          tierId,
          stripeEventId: event.id,
          amountSar,
          stripeSubscriptionId: subscription?.id,
          currentPeriodEnd: subscription ? periodEndIso(subscription) : undefined,
        });

        if (amountSar && plan) {
          const planInfo = PLAN_AMOUNTS[plan];
          const planLabel = planInfo?.label ?? plan;
          const invoice = await createSubscriptionInvoice(accountId, {
            planName: `${planLabel} (renewal)`,
            amount: amountSar,
          });

          const userReceipt = buildTriggerNotification({
            trigger: "subscription_payment",
            title: `Renewal confirmed — ${planLabel}`,
            titleAr: `تم تجديد الاشتراك — ${planLabel}`,
            body: `Your subscription renewed. Invoice ${invoice.invoiceNumber} for SR ${amountSar}.`,
            bodyAr: `تم تجديد اشتراكك. فاتورة ${invoice.invoiceNumber} بمبلغ ${amountSar} ر.س.`,
            amountSar,
            href: `/billing/invoices/${invoice.id}`,
            channels: ["in_app", "email"],
          });
          await serverDispatchNotification(userReceipt, { accountId, ownerEmail: false });
        }
      } else {
        await recordStripePaymentEvent({
          stripeEventId: event.id,
          type: event.type,
          accountId: accountId || undefined,
          amountSar,
          status: "processed",
          payloadSummary: { invoiceId: invoice.id, unresolved: true },
        });
      }

      console.info("Invoice paid:", invoice.id, invoice.amount_paid, invoice.billing_reason);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const { accountId } = await resolveSubscriptionContext(stripe, subscription);
      if (!accountId) break;

      const mappedStatus =
        subscription.status === "canceled"
          ? "cancelled"
          : subscription.status === "past_due"
            ? "past_due"
            : subscription.status === "unpaid" || subscription.status === "incomplete_expired"
              ? "expired"
              : "active";

      await applyStripeSubscriptionUpdated({
        accountId,
        stripeEventId: event.id,
        status: mappedStatus,
        currentPeriodEnd: periodEndIso(subscription),
        stripeSubscriptionId: subscription.id,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId =
        subscription.metadata?.account_id ??
        (typeof subscription.customer === "string"
          ? findAccountIdByStripeCustomerId(subscription.customer)
          : null) ??
        "";
      if (accountId) {
        await applyStripeSubscriptionCancelled(accountId, event.id);
      }
      console.info("Subscription cancelled:", subscription.id);
      break;
    }
    default:
      await recordStripePaymentEvent({
        stripeEventId: event.id,
        type: event.type,
        status: "received",
      });
      break;
  }

  return NextResponse.json({ received: true });
}
