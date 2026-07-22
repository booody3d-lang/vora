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
import type {
  AnalyticsTimeSeries,
  CategoryPerformance,
  IndustryHiring,
  RevenueDistribution,
} from "@/types/admin";

export type AdminAnalyticsTimeline = "30d" | "90d" | "120d";

const TIMELINE_BUCKETS: Record<
  AdminAnalyticsTimeline,
  { days: number; labels: string[] }
> = {
  "30d": { days: 30, labels: ["W1", "W2", "W3", "W4"] },
  "90d": { days: 90, labels: ["Apr", "May", "Jun", "Jul"] },
  "120d": { days: 120, labels: ["Mar", "Apr", "May", "Jun", "Jul"] },
};

function buildGrowthSeries(
  timeline: AdminAnalyticsTimeline,
  accountDates: string[],
  companyDates: string[]
): AnalyticsTimeSeries[] {
  const config = TIMELINE_BUCKETS[timeline];
  const end = Date.now();
  const start = end - config.days * 24 * 60 * 60 * 1000;

  return config.labels.map((label, index) => {
    const bucketEnd = start + ((index + 1) / config.labels.length) * (end - start);
    const users = accountDates.filter((value) => new Date(value).getTime() <= bucketEnd).length;
    const companies = companyDates.filter((value) => new Date(value).getTime() <= bucketEnd).length;
    return { label, users, companies };
  });
}

export interface AdminAnalyticsSnapshot {
  timeline: AdminAnalyticsTimeline;
  growth: AnalyticsTimeSeries[];
  revenueDistribution: RevenueDistribution[];
  topCategories: CategoryPerformance[];
  topIndustries: IndustryHiring[];
}

export async function getAdminAnalyticsFromSupabase(
  timeline: AdminAnalyticsTimeline
): Promise<AdminAnalyticsSnapshot> {
  const admin = createAdminClient();

  const [accountsRes, companiesRes, invoicesRes, commissionRes, ordersRes, jobsRes, appsRes] =
    await Promise.all([
      admin.from("accounts").select("created_at"),
      admin.from("companies").select("created_at, industry"),
      admin.from("invoices").select("type, total"),
      admin.from("wallet_transactions").select("amount").eq("type", "platform_commission"),
      admin
        .from("freelance_orders")
        .select("total_price, status, freelance_services(category)")
        .in("status", ["completed", "paid", "delivered"]),
      admin.from("jobs").select("id, company_id, companies(industry)"),
      admin.from("job_applications").select("job_id"),
    ]);

  if (accountsRes.error) throw accountsRes.error;
  if (companiesRes.error) throw companiesRes.error;
  if (invoicesRes.error) throw invoicesRes.error;
  if (commissionRes.error) throw commissionRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (jobsRes.error) throw jobsRes.error;
  if (appsRes.error) throw appsRes.error;

  const growth = buildGrowthSeries(
    timeline,
    (accountsRes.data ?? []).map((row) => row.created_at as string),
    (companiesRes.data ?? []).map((row) => row.created_at as string)
  );

  const subscriptionRevenue = (invoicesRes.data ?? [])
    .filter((row) => row.type === "subscription")
    .reduce((sum, row) => sum + Number(row.total), 0);
  const commissionRevenue = (commissionRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const otherRevenue = Math.max(
    0,
    (invoicesRes.data ?? [])
      .filter((row) => row.type !== "subscription")
      .reduce((sum, row) => sum + Number(row.total), 0) - commissionRevenue
  );

  const revenueDistribution: RevenueDistribution[] = [
    { label: "Subscriptions", amount: subscriptionRevenue, color: "#3B5998" },
    { label: "Commissions (10%)", amount: commissionRevenue, color: "#EA580C" },
    { label: "Other", amount: otherRevenue, color: "#64748B" },
  ];

  const categoryStats = new Map<string, { orders: number; revenue: number }>();
  for (const row of ordersRes.data ?? []) {
    const service = row.freelance_services as { category?: string | null } | null;
    const category = service?.category?.trim() || "General";
    const current = categoryStats.get(category) ?? { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(row.total_price);
    categoryStats.set(category, current);
  }

  const topCategories = Array.from(categoryStats.entries())
    .map(([category, stats]) => ({
      category,
      orders: stats.orders,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  const applicationsByJob = new Map<string, number>();
  for (const row of appsRes.data ?? []) {
    const jobId = row.job_id as string;
    applicationsByJob.set(jobId, (applicationsByJob.get(jobId) ?? 0) + 1);
  }

  const industryStats = new Map<string, { jobCount: number; applications: number }>();
  for (const row of jobsRes.data ?? []) {
    const company = row.companies as { industry?: string | null } | null;
    const industry = company?.industry?.trim() || "General";
    const current = industryStats.get(industry) ?? { jobCount: 0, applications: 0 };
    current.jobCount += 1;
    current.applications += applicationsByJob.get(row.id as string) ?? 0;
    industryStats.set(industry, current);
  }

  const topIndustries = Array.from(industryStats.entries())
    .map(([industry, stats]) => ({
      industry,
      jobCount: stats.jobCount,
      applications: stats.applications,
    }))
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, 5);

  return {
    timeline,
    growth: growth.some((point) => point.users > 0 || point.companies > 0)
      ? growth
      : timeline === "30d"
        ? ADMIN_GROWTH_30D
        : timeline === "90d"
          ? ADMIN_GROWTH_90D
          : ADMIN_GROWTH_120D,
    revenueDistribution:
      subscriptionRevenue + commissionRevenue + otherRevenue > 0
        ? revenueDistribution
        : ADMIN_REVENUE_DISTRIBUTION,
    topCategories: topCategories.length > 0 ? topCategories : ADMIN_TOP_CATEGORIES,
    topIndustries: topIndustries.length > 0 ? topIndustries : ADMIN_TOP_INDUSTRIES,
  };
}
