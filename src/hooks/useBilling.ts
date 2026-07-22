"use client";

import { useEffect, useState } from "react";
import { isPremiumUser } from "@/lib/billing/engine";
import type { SubscriptionPlan, SubscriptionStatus, UserSubscription } from "@/types/billing";

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: "free",
  status: "active",
  isPremium: false,
};

export function useBilling() {
  const [subscription, setSubscription] = useState<UserSubscription>(DEFAULT_SUBSCRIPTION);

  useEffect(() => {
    fetch("/api/subscription/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          authenticated?: boolean;
          effective?: { tierId?: string; status?: SubscriptionStatus };
          currentPlanId?: SubscriptionPlan | null;
        } | null) => {
          if (!data?.authenticated) return;

          const plan = (data.currentPlanId ?? "free") as SubscriptionPlan;
          const status = data.effective?.status ?? "active";
          const isPremium =
            plan === "premium_monthly" ||
            plan === "premium_yearly" ||
            plan === "company_annual";

          setSubscription({
            plan,
            status,
            isPremium: isPremium && status === "active",
          });
        }
      )
      .catch(() => {});
  }, []);

  return {
    subscription,
    isPremium: isPremiumUser(subscription),
    plan: subscription.plan,
  };
}
