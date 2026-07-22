"use client";

import { useEffect, useState } from "react";
import { SubscriptionBanner } from "@/components/company/layout/SubscriptionBanner";
import { DEMO_SUBSCRIPTION } from "@/lib/company/mock-data";
import type { CompanySubscription } from "@/types/company";

export function CompanySubscriptionBannerLoader() {
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/company/me", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;

        if (data.hasCompany && data.subscription) {
          setSubscription(data.subscription as CompanySubscription);
        } else {
          setSubscription(DEMO_SUBSCRIPTION);
        }
      } catch {
        if (!cancelled) setSubscription(DEMO_SUBSCRIPTION);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !subscription) return null;

  return <SubscriptionBanner subscription={subscription} />;
}
