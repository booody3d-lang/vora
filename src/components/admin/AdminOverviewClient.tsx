"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { OwnerAlertFeed } from "@/components/notifications/OwnerAlertFeed";
import { useTranslations } from "@/i18n/use-translations";
import {
  ADMIN_FINANCIAL_SUMMARY,
  ADMIN_PLATFORM_OVERVIEW,
} from "@/lib/admin/mock-data";
import { formatSar } from "@/lib/billing/engine";
import type { FinancialSummary, PlatformOverview } from "@/types/admin";

interface OverviewApiResponse {
  overview?: PlatformOverview;
  finance?: FinancialSummary;
  urgentDisputeCount?: number;
  latestDispute?: { orderNumber: string; serviceTitle: string } | null;
  persistence?: "supabase" | "demo" | "mixed";
}

export function AdminOverviewClient() {
  const { t } = useTranslations();
  const [overview, setOverview] = useState<PlatformOverview>(ADMIN_PLATFORM_OVERVIEW);
  const [finance, setFinance] = useState<FinancialSummary>(ADMIN_FINANCIAL_SUMMARY);
  const [urgentCount, setUrgentCount] = useState(0);
  const [latestDispute, setLatestDispute] = useState<{ orderNumber: string; serviceTitle: string } | null>(
    null
  );

  const loadOverview = useCallback(() => {
    fetch("/api/admin/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OverviewApiResponse | null) => {
        if (data?.overview) setOverview(data.overview);
        if (data?.finance) setFinance(data.finance);
        if (typeof data?.urgentDisputeCount === "number") setUrgentCount(data.urgentDisputeCount);
        if (data?.latestDispute !== undefined) setLatestDispute(data.latestDispute);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.overview.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.overview.subtitle")}</p>
      </div>

      <OwnerAlertFeed />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.overview.platformOverview")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={overview.totalUsers.label}
            value={overview.totalUsers.value}
            sublabel={t("admin.overview.userBreakdown", {
              basic: overview.basicUsers.toLocaleString(),
              professional: overview.professionalUsers.toLocaleString(),
            })}
            growthPercent={overview.totalUsers.growthPercent}
            accent="blue"
          />
          <MetricCard
            label={overview.totalCompanies.label}
            value={overview.totalCompanies.value}
            growthPercent={overview.totalCompanies.growthPercent}
            accent="blue"
          />
          <MetricCard
            label={overview.activeJobVacancies.label}
            value={overview.activeJobVacancies.value}
            growthPercent={overview.activeJobVacancies.growthPercent}
            accent="emerald"
          />
          <MetricCard
            label={overview.totalStores.label}
            value={overview.totalStores.value}
            growthPercent={overview.totalStores.growthPercent}
            accent="orange"
          />
          <MetricCard
            label={overview.publishedServices.label}
            value={overview.publishedServices.value}
            growthPercent={overview.publishedServices.growthPercent}
            accent="orange"
          />
          <MetricCard
            label={overview.activeEscrowOrders.label}
            value={overview.activeEscrowOrders.value}
            growthPercent={overview.activeEscrowOrders.growthPercent}
            accent="amber"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.overview.financialSnapshot")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t("admin.overview.grossRevenue")}
            value={formatSar(finance.grossPlatformRevenue)}
            growthPercent={finance.revenueGrowthPercent}
            accent="emerald"
          />
          <MetricCard
            label={t("admin.overview.subscriptionRevenue")}
            value={formatSar(finance.netSubscriptionRevenue)}
            sublabel={t("admin.overview.subscriptionSublabel")}
            accent="blue"
          />
          <MetricCard
            label={t("admin.overview.commissionRevenue")}
            value={formatSar(finance.netCommissionRevenue)}
            accent="orange"
          />
          <MetricCard
            label={t("admin.overview.escrowLiquidity")}
            value={formatSar(finance.activeEscrowLiquidity)}
            accent="amber"
          />
        </div>
      </section>

      {urgentCount > 0 && latestDispute && (
        <Link
          href="/admin/disputes"
          className="block rounded-2xl border border-red-500/30 bg-red-500/10 p-5 transition-colors hover:bg-red-500/15"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {t("common.urgent")}
              </span>
              <h3 className="mt-2 font-bold text-red-400">
                {t("admin.overview.disputesAttention", { count: urgentCount })}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {t("admin.overview.latestDispute", {
                  order: latestDispute.orderNumber,
                  service: latestDispute.serviceTitle,
                })}
              </p>
            </div>
            <span className="text-2xl text-red-400">→</span>
          </div>
        </Link>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/finance", labelKey: "admin.nav.financialSuite", descKey: "admin.overview.quickFinance" },
          { href: "/admin/users", labelKey: "admin.nav.userManagement", descKey: "admin.overview.quickUsers" },
          { href: "/admin/companies", labelKey: "admin.nav.companyOversight", descKey: "admin.overview.quickCompanies" },
          { href: "/admin/security", labelKey: "admin.nav.securityAudit", descKey: "admin.overview.quickSecurity" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5 hover:border-slate-600"
          >
            <h3 className="font-semibold text-white">{t(link.labelKey)}</h3>
            <p className="mt-1 text-xs text-slate-500">{t(link.descKey)}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
