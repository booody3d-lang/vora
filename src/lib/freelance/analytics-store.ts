import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  computeSellerAnalyticsFromSupabase,
  isSellerAnalyticsEmpty,
  recordStoreViewInSupabase,
} from "@/lib/freelance/analytics-supabase";
import { DEMO_SELLER_ANALYTICS } from "@/lib/freelance/mock-data";
import { listOrdersForAccount } from "@/lib/freelance/orders-store";
import { listServicesForAccount } from "@/lib/freelance/services-store";
import { getStoreForAccount, getStoreBySlugLive } from "@/lib/freelance/store-store";
import type { SellerAnalytics } from "@/types/freelance";

const ANALYTICS_FILE = "freelance-analytics.json";

interface AnalyticsDataFile {
  viewsByStoreSlug: Record<string, number>;
}

let analyticsTableProbed = false;
let analyticsTableAvailable = false;

export type AnalyticsSource = "supabase" | "json" | "demo";

export async function isAnalyticsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (analyticsTableProbed) return analyticsTableAvailable;

  analyticsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("store_analytics_daily").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("store_analytics_daily missing", error);
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

function readAnalyticsData(): AnalyticsDataFile {
  return readJsonStore(ANALYTICS_FILE, () => ({
    viewsByStoreSlug: {} as Record<string, number>,
  }));
}

function writeAnalyticsData(data: AnalyticsDataFile) {
  writeJsonStore(ANALYTICS_FILE, data);
}

async function computeAnalyticsFromLocalData(
  accountId: string,
  storeSlug: string
): Promise<SellerAnalytics> {
  const [orders, services, store] = await Promise.all([
    listOrdersForAccount(accountId),
    listServicesForAccount(accountId),
    getStoreBySlugLive(storeSlug),
  ]);

  const sellerOrders = orders.filter((order) => order.sellerId === accountId);
  const activeOrders = sellerOrders.filter((order) =>
    ["paid", "awaiting_requirements", "in_progress", "delivered", "revision_requested"].includes(order.status)
  ).length;

  const completedOrders = sellerOrders.filter((order) => order.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const views = readAnalyticsData().viewsByStoreSlug[storeSlug] ?? store?.viewCount ?? 0;

  const revenueByTitle = new Map<string, { sales: number; revenue: number }>();
  for (const order of completedOrders) {
    const current = revenueByTitle.get(order.service.title) ?? { sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue += order.totalPrice;
    revenueByTitle.set(order.service.title, current);
  }

  for (const service of services) {
    if (!revenueByTitle.has(service.title)) {
      revenueByTitle.set(service.title, { sales: service.salesCount, revenue: 0 });
    }
  }

  const topServices = Array.from(revenueByTitle.entries())
    .map(([title, values]) => ({ title, sales: values.sales, revenue: values.revenue }))
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales)
    .slice(0, 5);

  const now = new Date();
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = monthLabels[monthDate.getMonth()];
    const revenue = completedOrders
      .filter((order) => {
        const created = new Date(order.createdAt);
        return created.getMonth() === monthDate.getMonth() && created.getFullYear() === monthDate.getFullYear();
      })
      .reduce((sum, order) => sum + order.totalPrice, 0);
    return { month, revenue };
  });

  return {
    totalViews: views,
    activeOrders,
    totalRevenue,
    conversionRate: views > 0 ? Math.round((sellerOrders.length / views) * 1000) / 10 : store?.conversionRate ?? 0,
    monthlyRevenue,
    topServices,
  };
}

function resolveAnalyticsResult(
  liveAnalytics: SellerAnalytics,
  jsonAnalytics: SellerAnalytics,
  liveSource: AnalyticsSource
): { analytics: SellerAnalytics; source: AnalyticsSource } {
  if (!isSellerAnalyticsEmpty(liveAnalytics)) {
    return { analytics: liveAnalytics, source: liveSource };
  }
  if (!isSellerAnalyticsEmpty(jsonAnalytics)) {
    return { analytics: jsonAnalytics, source: "json" };
  }
  if (jsonAnalytics.totalViews > 0 || jsonAnalytics.activeOrders > 0) {
    return { analytics: jsonAnalytics, source: "json" };
  }
  return { analytics: DEMO_SELLER_ANALYTICS, source: "demo" };
}

export async function getSellerAnalyticsForAccount(
  accountId: string
): Promise<{ analytics: SellerAnalytics; source: AnalyticsSource }> {
  const store = await getStoreForAccount(accountId);
  if (!store) {
    return { analytics: DEMO_SELLER_ANALYTICS, source: "demo" };
  }

  const jsonAnalytics = await computeAnalyticsFromLocalData(accountId, store.slug);

  if (!(await isAnalyticsSupabaseReady()) || !isValidBillingUuid(store.id)) {
    return resolveAnalyticsResult(jsonAnalytics, jsonAnalytics, "json");
  }

  const liveAnalytics = await runOptionalDbSync(
    "getSellerAnalyticsForAccount",
    () => computeSellerAnalyticsFromSupabase(store.id),
    jsonAnalytics
  );

  return resolveAnalyticsResult(liveAnalytics, jsonAnalytics, "supabase");
}

export async function getSellerAnalyticsForStoreSlug(
  storeSlug: string,
  accountId: string
): Promise<{ analytics: SellerAnalytics; source: AnalyticsSource }> {
  void storeSlug;
  return getSellerAnalyticsForAccount(accountId);
}

export async function recordStoreView(storeSlug: string): Promise<void> {
  const data = readAnalyticsData();
  data.viewsByStoreSlug[storeSlug] = (data.viewsByStoreSlug[storeSlug] ?? 0) + 1;
  writeAnalyticsData(data);

  const store = await getStoreBySlugLive(storeSlug);
  if (!store || !(await isAnalyticsSupabaseReady()) || !isValidBillingUuid(store.id)) {
    return;
  }

  await runOptionalDbSyncVoid("recordStoreView", () => recordStoreViewInSupabase(store.id));
}

export function isAnalyticsPersistenceActive(): boolean {
  return analyticsTableAvailable;
}
