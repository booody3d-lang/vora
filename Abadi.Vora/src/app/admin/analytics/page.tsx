"use client";

import { useState } from "react";
import {
  AdminBarChart,
  AdminChartCard,
  AdminLineChart,
  AdminPieChart,
} from "@/components/admin/AdminCharts";
import {
  ADMIN_GROWTH_120D,
  ADMIN_GROWTH_30D,
  ADMIN_GROWTH_90D,
  ADMIN_REVENUE_DISTRIBUTION,
  ADMIN_TOP_CATEGORIES,
  ADMIN_TOP_INDUSTRIES,
} from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import { formatSar } from "@/lib/billing/engine";

type Timeline = "30d" | "90d" | "120d";

export default function AdminAnalyticsPage() {
  const { t } = useTranslations();
  const [timeline, setTimeline] = useState<Timeline>("30d");

  const growthData =
    timeline === "30d" ? ADMIN_GROWTH_30D : timeline === "90d" ? ADMIN_GROWTH_90D : ADMIN_GROWTH_120D;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.analytics.title")}</h1>
        <p className="text-sm text-slate-400">Growth velocity · Revenue distribution · Category & industry performance</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-900 p-1 w-fit">
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
        <AdminChartCard title="User & Company Growth" subtitle={`${timeline} timeline`}>
          <AdminLineChart data={growthData} />
        </AdminChartCard>

        <AdminChartCard title="Revenue Distribution" subtitle="Subscription vs Commissions">
          <AdminPieChart data={ADMIN_REVENUE_DISTRIBUTION} />
        </AdminChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminChartCard title="Top Service Categories" subtitle="By order volume">
          <AdminBarChart
            data={ADMIN_TOP_CATEGORIES.map((c) => ({ label: c.category.split(" ")[0], value: c.orders }))}
            color="#EA580C"
          />
          <div className="mt-4 space-y-1">
            {ADMIN_TOP_CATEGORIES.slice(0, 3).map((c) => (
              <div key={c.category} className="flex justify-between text-xs">
                <span className="text-slate-400">{c.category}</span>
                <span className="text-emerald-400">{formatSar(c.revenue)}</span>
              </div>
            ))}
          </div>
        </AdminChartCard>

        <AdminChartCard title="Top Hiring Industries" subtitle="Job postings & applications">
          <AdminBarChart
            data={ADMIN_TOP_INDUSTRIES.map((i) => ({ label: i.industry.split(" ")[0], value: i.jobCount }))}
            color="#3B5998"
          />
          <div className="mt-4 space-y-1">
            {ADMIN_TOP_INDUSTRIES.slice(0, 3).map((i) => (
              <div key={i.industry} className="flex justify-between text-xs">
                <span className="text-slate-400">{i.industry}</span>
                <span className="text-slate-300">{i.applications.toLocaleString()} apps</span>
              </div>
            ))}
          </div>
        </AdminChartCard>
      </div>
    </div>
  );
}
