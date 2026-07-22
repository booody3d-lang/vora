import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminFinanceSummary, isWalletPersistenceActive } from "@/lib/billing/wallet-store";
import { getUrgentDisputeCountLive, isDisputesPersistenceActive, listDisputesForAdmin } from "@/lib/admin/admin-disputes-store";
import { getAdminPlatformOverviewFromSupabase } from "@/lib/admin/admin-overview-supabase";
import { ADMIN_FINANCIAL_SUMMARY, ADMIN_PLATFORM_OVERVIEW } from "@/lib/admin/mock-data";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import type { FinancialSummary, PlatformOverview } from "@/types/admin";

let overviewTableProbed = false;
let overviewTableAvailable = false;

export async function isAdminOverviewSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (overviewTableProbed) return overviewTableAvailable;

  overviewTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("accounts").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("accounts missing", error);
      }
      overviewTableAvailable = false;
      return false;
    }
    overviewTableAvailable = true;
    return true;
  } catch {
    overviewTableAvailable = false;
    return false;
  }
}

export async function getAdminPlatformOverviewLive(): Promise<PlatformOverview> {
  const demoFallback = ADMIN_PLATFORM_OVERVIEW;

  if (!(await isAdminOverviewSupabaseReady())) {
    return demoFallback;
  }

  return runOptionalDbSync(
    "getAdminPlatformOverviewLive",
    () => getAdminPlatformOverviewFromSupabase(),
    demoFallback
  );
}

function toFinancialSummary(metrics: Awaited<ReturnType<typeof getAdminFinanceSummary>>): FinancialSummary {
  return {
    grossPlatformRevenue: metrics.grossPlatformRevenue,
    netSubscriptionRevenue: metrics.netSubscriptionRevenue,
    netCommissionRevenue: metrics.netCommissionRevenue,
    activeEscrowLiquidity: metrics.activeEscrowLiquidity,
    revenueGrowthPercent: metrics.revenueGrowthPercent,
  };
}

export interface AdminOverviewSnapshot {
  overview: PlatformOverview;
  finance: FinancialSummary;
  urgentDisputeCount: number;
  latestDispute: { orderNumber: string; serviceTitle: string } | null;
  persistence: "supabase" | "demo" | "mixed";
}

export async function getAdminOverviewSnapshot(): Promise<AdminOverviewSnapshot> {
  const [overview, financeMetrics, urgentDisputeCount, disputes] = await Promise.all([
    getAdminPlatformOverviewLive(),
    getAdminFinanceSummary(),
    getUrgentDisputeCountLive(),
    listDisputesForAdmin(),
  ]);

  const urgentDispute =
    disputes.find((ticket) => ticket.status === "urgent") ??
    disputes.find((ticket) => ticket.status === "in_review") ??
    null;

  const usesSupabase =
    (await isAdminOverviewSupabaseReady()) ||
    isWalletPersistenceActive() ||
    isDisputesPersistenceActive();
  const allSupabase =
    (await isAdminOverviewSupabaseReady()) &&
    isWalletPersistenceActive() &&
    isDisputesPersistenceActive();

  return {
    overview,
    finance: toFinancialSummary(financeMetrics),
    urgentDisputeCount,
    latestDispute: urgentDispute
      ? { orderNumber: urgentDispute.orderNumber, serviceTitle: urgentDispute.serviceTitle }
      : null,
    persistence: allSupabase ? "supabase" : usesSupabase ? "mixed" : "demo",
  };
}

export function isAdminOverviewPersistenceActive(): boolean {
  return overviewTableAvailable;
}

export function getDemoFinancialSummary(): FinancialSummary {
  return ADMIN_FINANCIAL_SUMMARY;
}
