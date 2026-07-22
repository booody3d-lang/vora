"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { useTranslations } from "@/i18n/use-translations";
import type { AdminJobPosting, ModerationCompany } from "@/types/admin";

interface AdminCompanyOverview {
  totalCompanies: number;
  activeJobVacancies: number;
  pendingVerification: number;
  expiredSubscriptions: number;
}

interface AdminCompaniesResponse {
  overview: AdminCompanyOverview;
  companies: ModerationCompany[];
  jobs: AdminJobPosting[];
  persistence: "supabase" | "demo";
}

export function AdminCompaniesClient() {
  const { t } = useTranslations();
  const [data, setData] = useState<AdminCompaniesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/companies");
        if (!response.ok) {
          throw new Error(`Failed to load admin companies (${response.status})`);
        }
        const payload = (await response.json()) as AdminCompaniesResponse;
        if (!cancelled) setData(payload);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabels: Record<string, string> = {
    active: t("admin.companies.statusActive"),
    paused: t("admin.companies.statusPaused"),
    expired: t("admin.companies.statusExpired"),
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.companies.title")}</h1>
          <p className="text-sm text-slate-400">{t("admin.companies.subtitle")}</p>
        </div>
        <p className="text-sm text-slate-500">{t("common.loading") ?? "Loading..."}</p>
      </div>
    );
  }

  const { overview, companies, jobs } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.companies.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.companies.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("admin.companies.registeredCompanies")}
          value={overview.totalCompanies.toLocaleString()}
          accent="blue"
        />
        <MetricCard
          label={t("admin.companies.activeJobs")}
          value={overview.activeJobVacancies.toLocaleString()}
          accent="emerald"
        />
        <MetricCard
          label={t("admin.companies.pendingVerification")}
          value={String(overview.pendingVerification)}
          accent="amber"
        />
        <MetricCard
          label={t("admin.companies.expiredSubscriptions")}
          value={String(overview.expiredSubscriptions)}
          accent="orange"
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.companies.jobPostings")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-start text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("admin.companies.colJob")}</th>
                <th className="px-5 py-3">{t("admin.companies.colCompany")}</th>
                <th className="px-5 py-3">{t("admin.companies.colLocation")}</th>
                <th className="px-5 py-3">{t("admin.companies.colApplications")}</th>
                <th className="px-5 py-3">{t("admin.companies.colStatus")}</th>
                <th className="px-5 py-3">{t("admin.companies.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-800">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{job.title}</p>
                    {job.requireVideoPitch && (
                      <p className="text-[10px] text-amber-400">🎬 {t("admin.companies.videoRequired")}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{job.companyName}</td>
                  <td className="px-5 py-4 text-slate-400">{job.location}</td>
                  <td className="px-5 py-4 text-slate-300">{job.applicationCount}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                      {statusLabels[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/company/dashboard/ats/${job.id}`}
                      className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      {t("admin.companies.viewAts")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.companies.companyDirectory")}
        </h2>
        <div className="space-y-3">
          {companies.map((co) => (
            <div
              key={co.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{co.name}</h3>
                  {!co.licenseVerified && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                      {t("admin.companies.licenseUnverified")}
                    </span>
                  )}
                  {co.reportCount > 0 && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                      {t("admin.companies.reports").replace("{count}", String(co.reportCount))}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {t("admin.companies.activeJobsCount").replace("{count}", String(co.activeJobs))} ·{" "}
                  {t("admin.companies.subscription").replace("{status}", co.subscriptionStatus)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/network/company/${co.slug}`}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                >
                  {t("admin.companies.viewPage")}
                </Link>
                <Link
                  href="/admin/moderation"
                  className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/30"
                >
                  {t("admin.companies.auditPage")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
