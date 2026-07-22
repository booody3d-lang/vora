import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import type { SellerAnalytics } from "@/types/freelance";

interface DailyAnalyticsRow {
  date: string;
  views: number;
  orders: number;
  revenue: number;
}

interface OrderRow {
  id: string;
  status: string;
  total_price: number;
  service_id: string;
  created_at: string;
}

interface ServiceRow {
  id: string;
  title: string;
  sales_count: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlyRevenue(rows: DailyAnalyticsRow[]): SellerAnalytics["monthlyRevenue"] {
  const now = new Date();
  const buckets = new Map<string, number>();

  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(MONTH_LABELS[monthDate.getMonth()], 0);
  }

  for (const row of rows) {
    const label = MONTH_LABELS[new Date(row.date).getMonth()];
    if (!buckets.has(label)) continue;
    buckets.set(label, (buckets.get(label) ?? 0) + Number(row.revenue));
  }

  return Array.from(buckets.entries()).map(([month, revenue]) => ({ month, revenue }));
}

export async function computeSellerAnalyticsFromSupabase(storeId: string): Promise<SellerAnalytics> {
  const admin = createAdminClient();

  const [{ data: store, error: storeError }, { data: dailyRows, error: dailyError }, { data: orders, error: ordersError }, { data: services, error: servicesError }] =
    await Promise.all([
      admin
        .from("freelancer_stores")
        .select("view_count, conversion_rate")
        .eq("id", storeId)
        .maybeSingle(),
      admin
        .from("store_analytics_daily")
        .select("date, views, orders, revenue")
        .eq("store_id", storeId)
        .order("date", { ascending: false })
        .limit(180),
      admin
        .from("freelance_orders")
        .select("id, status, total_price, service_id, created_at")
        .eq("store_id", storeId),
      admin.from("freelance_services").select("id, title, sales_count").eq("store_id", storeId),
    ]);

  if (storeError) throw storeError;
  if (dailyError) throw dailyError;
  if (ordersError) throw ordersError;
  if (servicesError) throw servicesError;

  const analyticsRows = (dailyRows ?? []) as DailyAnalyticsRow[];
  const orderRows = (orders ?? []) as OrderRow[];
  const serviceRows = (services ?? []) as ServiceRow[];

  const totalViewsFromDaily = analyticsRows.reduce((sum, row) => sum + Number(row.views), 0);
  const totalRevenueFromDaily = analyticsRows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const totalRevenueFromOrders = orderRows
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + Number(order.total_price), 0);

  const activeOrders = orderRows.filter((order) =>
    ["paid", "awaiting_requirements", "in_progress", "delivered", "revision_requested"].includes(order.status)
  ).length;

  const revenueByService = new Map<string, number>();
  for (const order of orderRows.filter((row) => row.status === "completed")) {
    revenueByService.set(
      order.service_id,
      (revenueByService.get(order.service_id) ?? 0) + Number(order.total_price)
    );
  }

  const topServices = serviceRows
    .map((service) => ({
      title: service.title,
      sales: service.sales_count ?? 0,
      revenue: revenueByService.get(service.id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales)
    .slice(0, 5);

  const totalViews = Math.max(Number(store?.view_count ?? 0), totalViewsFromDaily);
  const totalRevenue = totalRevenueFromOrders > 0 ? totalRevenueFromOrders : totalRevenueFromDaily;
  const conversionRate =
    totalViews > 0
      ? Math.round((orderRows.length / totalViews) * 1000) / 10
      : Number(store?.conversion_rate ?? 0);

  return {
    totalViews,
    activeOrders,
    totalRevenue,
    conversionRate,
    monthlyRevenue: buildMonthlyRevenue(analyticsRows),
    topServices,
  };
}

export async function recordStoreViewInSupabase(storeId: string): Promise<void> {
  if (!isValidBillingUuid(storeId)) return;

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await admin
    .from("store_analytics_daily")
    .select("id, views")
    .eq("store_id", storeId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    await admin
      .from("store_analytics_daily")
      .update({ views: Number(existing.views) + 1 })
      .eq("id", existing.id);
  } else {
    await admin.from("store_analytics_daily").insert({
      store_id: storeId,
      date: today,
      views: 1,
      orders: 0,
      revenue: 0,
    });
  }

  const { data: store } = await admin
    .from("freelancer_stores")
    .select("view_count")
    .eq("id", storeId)
    .maybeSingle();

  await admin
    .from("freelancer_stores")
    .update({
      view_count: Number(store?.view_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
}

export function isSellerAnalyticsEmpty(analytics: SellerAnalytics): boolean {
  return (
    analytics.totalViews === 0 &&
    analytics.activeOrders === 0 &&
    analytics.totalRevenue === 0 &&
    analytics.topServices.length === 0 &&
    analytics.monthlyRevenue.every((point) => point.revenue === 0)
  );
}
