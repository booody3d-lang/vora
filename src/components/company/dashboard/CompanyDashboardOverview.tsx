"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { computeSubscriptionState } from "@/lib/company/mock-data";
import { CompanyPostsPanel } from "@/components/company/dashboard/CompanyPostsPanel";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useLocale } from "@/providers/LocaleProvider";
import type { JobPosting } from "@/types/company";

export function CompanyDashboardOverview() {
  const { t } = useLocale();
  const { company, subscription, loading } = useCurrentCompany();
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/company/jobs", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setJobs((data.jobs ?? []) as JobPosting[]);
        }
      } catch {
        // keep empty list
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [company]);

  if (loading) {
    return <div className="py-10 text-center text-slate-500">{t("common.loading")}</div>;
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-[#0F172A]">{t("company.settings.notFound")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("company.settings.setupHint")}</p>
          <Link
            href="/company/onboarding"
            className="mt-6 inline-flex rounded-lg bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2d4373]"
          >
            {t("company.settings.setupCta")}
          </Link>
        </div>
      </div>
    );
  }

  const companyName = company.name;
  const followerCount = company?.followerCount ?? 0;
  const subState = subscription
    ? computeSubscriptionState(subscription)
    : {
        canPublish: false,
        isPaywallActive: true,
        daysRemaining: 0,
        freeJobsRemaining: 0,
        message: "No subscription data",
      };
  const activeJobsCount = jobs.filter((job) => job.status === "active").length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">
          {t("company.dashboard.welcome").replace("{name}", companyName)}
        </h1>
        <p className="text-sm text-slate-500">{t("company.dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("company.dashboard.activeJobs")}
          value={String(activeJobsCount)}
        />
        <StatCard label={t("company.dashboard.totalApplications")} value="42" />
        <StatCard
          label={t("company.dashboard.followers")}
          value={followerCount.toLocaleString()}
        />
        <StatCard
          label={t("company.dashboard.freeJobsLeft")}
          value={String(subState.freeJobsRemaining)}
          highlight={subState.freeJobsRemaining <= 1}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">{t("company.dashboard.quickActions")}</h2>
          <div className="mt-4 space-y-2">
            <Link
              href="/company/dashboard/settings"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.editCompanyPage")}
            </Link>
            <Link
              href="/company/dashboard/jobs/new"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.postNewJob")}
            </Link>
            <Link
              href="/company/dashboard/jobs"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.manageJobs")}
            </Link>
            <Link
              href="/company/dashboard/ats"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.openAts")}
            </Link>
            <Link
              href="/billing/plans?audience=company"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.manageSubscription")}
            </Link>
            <Link
              href="/company/dashboard/analytics"
              className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50"
            >
              {t("company.dashboard.viewAnalytics")}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">{t("company.dashboard.restrictions")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="text-red-400">✕</span> {t("company.dashboard.noFreelanceStores")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-400">✕</span> {t("company.dashboard.noFreelanceServices")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-400">✕</span> {t("company.dashboard.noPremiumPlans")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span> {t("company.dashboard.canPostJobs")}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span> {t("company.dashboard.canUseAts")}
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <CompanyPostsPanel />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
    >
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
