"use client";

import { SubscriptionBanner } from "@/components/company/layout/SubscriptionBanner";
import { useCurrentCompany } from "@/hooks/use-current-company";

export function CompanySubscriptionBannerLoader() {
  const { subscription, loading } = useCurrentCompany();

  if (loading || !subscription) return null;

  return <SubscriptionBanner subscription={subscription} />;
}
