import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_GROWTH_120D,
  ADMIN_GROWTH_30D,
  ADMIN_GROWTH_90D,
  ADMIN_REVENUE_DISTRIBUTION,
  ADMIN_TOP_CATEGORIES,
  ADMIN_TOP_INDUSTRIES,
} from "@/lib/admin/mock-data";
import {
  getAdminAnalyticsFromSupabase,
  type AdminAnalyticsSnapshot,
  type AdminAnalyticsTimeline,
} from "@/lib/admin/admin-analytics-supabase";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";

let analyticsTableProbed = false;
let analyticsTableAvailable = false;

function demoSnapshot(timeline: AdminAnalyticsTimeline): AdminAnalyticsSnapshot {
  return {
    timeline,
    growth:
      timeline === "30d"
        ? ADMIN_GROWTH_30D
        : timeline === "90d"
          ? ADMIN_GROWTH_90D
          : ADMIN_GROWTH_120D,
    revenueDistribution: ADMIN_REVENUE_DISTRIBUTION,
    topCategories: ADMIN_TOP_CATEGORIES,
    topIndustries: ADMIN_TOP_INDUSTRIES,
  };
}

export async function isAdminAnalyticsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (analyticsTableProbed) return analyticsTableAvailable;

  analyticsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("accounts").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("accounts missing", error);
      }
      analyticsTableAvailable = false;
      return false;
    }
    analyticsTableAvailable = true;
    return true;
  } catch {
    analyticsTableAvailable = false;
    return false;
  }
}

export async function getAdminAnalyticsSnapshot(
  timeline: AdminAnalyticsTimeline = "30d"
): Promise<AdminAnalyticsSnapshot> {
  const fallback = demoSnapshot(timeline);

  if (!(await isAdminAnalyticsSupabaseReady())) {
    return fallback;
  }

  return runOptionalDbSync(
    "getAdminAnalyticsSnapshot",
    () => getAdminAnalyticsFromSupabase(timeline),
    fallback
  );
}

export function isAdminAnalyticsPersistenceActive(): boolean {
  return analyticsTableAvailable;
}

export type { AdminAnalyticsSnapshot, AdminAnalyticsTimeline };
