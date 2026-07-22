import "server-only";

import { billingPlanSpec } from "@/lib/billing/plan-catalog";
import {
  applyStripeCheckoutCompleted,
  applyStripeSubscriptionCancelled,
  ensureSubscriptionCacheHydrated,
  getAccountAssignment,
  setStripeCustomerMapping,
} from "@/lib/subscription/subscription-store";
import type { SubscriptionPlan } from "@/types/billing";

function computeSimulatedPeriodEnd(plan: SubscriptionPlan): string {
  const spec = billingPlanSpec(plan);
  const end = new Date();
  if (spec?.interval === "year") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end.toISOString();
}

function simulatedCustomerId(accountId: string): string {
  return `sim_cus_${accountId}`;
}

function simulatedSubscriptionId(accountId: string): string {
  return `sim_sub_${accountId}`;
}

export async function simulateSubscriptionCheckout(input: {
  accountId: string;
  plan: SubscriptionPlan;
  successUrl: string;
}): Promise<{ url: string; simulated: true }> {
  if (input.plan === "free") {
    throw new Error("Free plan does not require checkout");
  }

  await ensureSubscriptionCacheHydrated();

  const spec = billingPlanSpec(input.plan);
  const eventId = `sim_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const subscriptionId = simulatedSubscriptionId(input.accountId);

  await setStripeCustomerMapping(input.accountId, simulatedCustomerId(input.accountId));
  await applyStripeCheckoutCompleted({
    accountId: input.accountId,
    plan: input.plan,
    stripeEventId: eventId,
    amountSar: spec?.priceSar,
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: computeSimulatedPeriodEnd(input.plan),
  });

  const url = new URL(input.successUrl);
  url.searchParams.set("simulated", "true");
  url.searchParams.set("plan", input.plan);

  return { url: url.toString(), simulated: true };
}

export async function simulateSubscriptionCancel(accountId: string): Promise<boolean> {
  await ensureSubscriptionCacheHydrated();
  const assignment = getAccountAssignment(accountId);
  if (!assignment || assignment.status !== "active") return false;

  await applyStripeSubscriptionCancelled(accountId, `sim_cancel_${Date.now()}`);
  return true;
}

export function userHasSimulatedBilling(accountId: string): boolean {
  const assignment = getAccountAssignment(accountId);
  return Boolean(
    assignment?.source === "billing" &&
      assignment.status === "active" &&
      assignment.stripeSubscriptionId?.startsWith("sim_sub_")
  );
}
