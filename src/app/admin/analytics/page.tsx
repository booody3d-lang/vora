"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminBarChart,
  AdminChartCard,
  AdminLineChart,
  AdminPieChart,
} from "@/components/admin/AdminCharts";
import {
  ADMIN_GROWTH_30D,
  ADMIN_REVENUE_DISTRIBUTION,
  ADMIN_TOP_CATEGORIES,
  ADMIN_TOP_INDUSTRIES,
} from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import { formatSar } from "@/lib/billing/engine";
import type {
  AnalyticsTimeSeries,
  CategoryPerformance,
  IndustryHiring,
  RevenueDistribution,
} from "@/types/admin";

type Timeline = "30d" | "90d" | "120d";

export default function AdminAnalyticsPage() {
  const { t } = useTranslations();
  const [timeline, setTimeline] = useState<Timeline>("30d");
  const [growthData, setGrowthData] = useState<AnalyticsTimeSeries[]>(ADMIN_GROWTH_30D);
  const [revenueDistribution, setRevenueDistribution] =
    useState<RevenueDistribution[]>(ADMIN_REVENUE_DISTRIBUTION);
  const [topCategories, setTopCategories] = useState<CategoryPerformance[]>(ADMIN_TOP_CATEGORIES);
  const [topIndustries, setTopIndustries] = useState<IndustryHiring[]>(ADMIN_TOP_INDUSTRIES);
  const [persistence, setPersistence] = useState<"supabase" | "demo">("demo");

  const loadAnalytics = useCallback((range: Timeline) => {
    fetch(`/api/admin/analytics?timeline=${range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            growth?: AnalyticsTimeSeries[];
            revenueDistribution?: RevenueDistribution[];
            topCategories?: CategoryPerformance[];
            topIndustries?: IndustryHiring[];
            persistence?: "supabase" | "demo";
          } | null
        ) => {
          if (data?.growth) setGrowthData(data.growth);
          if (data?.revenueDistribution) setRevenueDistribution(data.revenueDistribution);
          if (data?.topCategories) setTopCategories(data.topCategories);
          if (data?.topIndustries) setTopIndustries(data.topIndustries);
          if (data?.persistence) setPersistence(data.persistence);
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAnalytics(timeline);
  }, [loadAnalytics, timeline]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.analytics.title")}</h1>
          <p className="text-sm text-slate-400">{t("admin.analytics.subtitle")}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {persistence === "supabase" ? "Supabase live" : "Demo fallback"}
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-slate-900 p-1">
        {(["30d", "90d", "120d"] as Timeline[]).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeline(range)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              timeline === range ? "bg-red-600/20 text-red-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {range === "30d"
              ? t("admin.analytics.days30")
              : range === "90d"
                ? t("admin.analytics.days90")
                : t("admin.analytics.days120")}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminChartCard title={t("admin.analytics.growthTitle")} subtitle={timeline}>
          <AdminLineChart data={growthData} />
        </AdminChartCard>

        <AdminChartCard title={t("admin.analytics.revenueTitle")} subtitle={t("admin.analytics.revenueSubtitle")}>
          <AdminPieChart data={revenueDistribution} />
        </AdminChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminChartCard title={t("admin.analytics.categoriesTitle")} subtitle={t("admin.analytics.categoriesSubtitle")}>
          <AdminBarChart
            data={topCategories.map((category) => ({
              label: category.category.split(" ")[0],
              value: category.orders,
            }))}
            color="#EA580C"
          />
          <div className="mt-4 space-y-1">
            {topCategories.slice(0, 3).map((category) => (
              <div key={category.category} className="flex justify-between text-xs">
                <span className="text-slate-400">{category.category}</span>
                <span className="text-emerald-400">{formatSar(category.revenue)}</span>
              </div>
            ))}
          </div>
        </AdminChartCard>

        <AdminChartCard title={t("admin.analytics.industriesTitle")} subtitle={t("admin.analytics.industriesSubtitle")}>
          <AdminBarChart
            data={topIndustries.map((industry) => ({
              label: industry.industry.split(" ")[0],
              value: industry.jobCount,
            }))}
            color="#3B5998"
          />
          <div className="mt-4 space-y-1">
            {topIndustries.slice(0, 3).map((industry) => (
              <div key={industry.industry} className="flex justify-between text-xs">
                <span className="text-slate-400">{industry.industry}</span>
                <span className="text-slate-300">{industry.applications.toLocaleString()} apps</span>
              </div>
            ))}
          </div>
        </AdminChartCard>
      </div>
    </div>
  );
}
