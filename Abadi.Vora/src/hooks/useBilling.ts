"use client";

import { DEMO_SUBSCRIPTION, isPremiumUser } from "@/lib/billing/engine";

export function useBilling() {
  const subscription = DEMO_SUBSCRIPTION;
  return {
    subscription,
    isPremium: isPremiumUser(subscription),
    plan: subscription.plan,
  };
}
