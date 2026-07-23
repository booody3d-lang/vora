import "server-only";

import {
  planIdToTierId,
  resolveTierAndPlanFromStripePriceId,
} from "@/lib/billing/resolve-plans";
import { resolveStripeWebhookSecret } from "@/lib/billing/stripe-server";
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
  applyStripeInvoicePaymentFailed,
  applyStripeSubscriptionCancelled,
  applyStripeSubscriptionUpdated,
  ensureSubscriptionCacheHydrated,
  findAccountIdByStripeCustomerId,
  listSubscriptionTiers,
  recordStripePaymentEvent,
  setStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import type { SubscriptionPlan } from "@/types/billing";
import Stripe from "stripe";

export type StripeWebhookVerifyResult =
  | { ok: true; event: Stripe.Event }
  | { ok: false; error: string; status: 400 | 503 };

function periodEndIso(subscription: Stripe.Subscription): string | undefined {
  const end = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (!end) return undefined;
  return new Date(end * 1000).toISOString();
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "cancelled" | "past_due" | "expired" {
  if (status === "canceled") return "cancelled";
  if (status === "past_due") return "past_due";
  if (status === "unpaid" || status === "incomplete_expired") return "expired";
  return "active";
}

export async function resolveSubscriptionContext(
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

/** Verify Stripe webhook signature against the raw request body. */
export function verifyStripeWebhookSignature(
  stripe: Stripe,
  rawBody: string,
  signature: string | null
): StripeWebhookVerifyResult {
  const webhookSecret = resolveStripeWebhookSecret();
  if (!signature || !webhookSecret) {
    return { ok: false, error: "Missing webhook signature", status: 400 };
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return { ok: true, event };
  } catch {
    return { ok: false, error: "Invalid signature", status: 400 };
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
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
}

async function handleInvoicePaid(stripe: Stripe, event: Stripe.Event): Promise<void> {
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
    return;
  }

  const subscriptionRef = (invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;

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
      const renewalInvoice = await createSubscriptionInvoice(accountId, {
        planName: `${planLabel} (renewal)`,
        amount: amountSar,
      });

      const userReceipt = buildTriggerNotification({
        trigger: "subscription_payment",
        title: `Renewal confirmed — ${planLabel}`,
        titleAr: `تم تجديد الاشتراك — ${planLabel}`,
        body: `Your subscription renewed. Invoice ${renewalInvoice.invoiceNumber} for SR ${amountSar}.`,
        bodyAr: `تم تجديد اشتراكك. فاتورة ${renewalInvoice.invoiceNumber} بمبلغ ${amountSar} ر.س.`,
        amountSar,
        href: `/billing/invoices/${renewalInvoice.id}`,
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
}

async function handleInvoicePaymentFailed(stripe: Stripe, event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const amountSar = invoice.amount_due ? invoice.amount_due / 100 : undefined;
  const subscriptionRef = (invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;

  const { subscription, accountId, plan, tierId } = await resolveSubscriptionContext(
    stripe,
    subscriptionRef
  );

  if (!accountId) {
    await recordStripePaymentEvent({
      stripeEventId: event.id,
      type: event.type,
      amountSar,
      status: "failed",
      payloadSummary: { invoiceId: invoice.id, unresolved: true },
    });
    return;
  }

  await applyStripeInvoicePaymentFailed({
    accountId,
    stripeEventId: event.id,
    invoiceId: invoice.id,
    amountSar,
    subscriptionId: subscription?.id,
    plan,
    tierId,
  });
}

async function handleSubscriptionUpdated(stripe: Stripe, event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const { accountId, plan, tierId } = await resolveSubscriptionContext(stripe, subscription);
  if (!accountId) return;

  await applyStripeSubscriptionUpdated({
    accountId,
    stripeEventId: event.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEndIso(subscription),
    stripeSubscriptionId: subscription.id,
    plan,
    tierId,
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
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
}

/** Dispatch a verified Stripe webhook event to the appropriate handler. */
export async function handleStripeWebhookEvent(
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(stripe, event);
      break;
    case "invoice.paid":
      await handleInvoicePaid(stripe, event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(stripe, event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(stripe, event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    default:
      await recordStripePaymentEvent({
        stripeEventId: event.id,
        type: event.type,
        status: "received",
      });
      break;
  }
}
