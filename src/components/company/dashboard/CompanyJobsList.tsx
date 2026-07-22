"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAtsUrl } from "@/lib/company/mock-data";
import { useLocale } from "@/providers/LocaleProvider";
import type { JobPosting } from "@/types/company";

export function CompanyJobsList() {
  const { t } = useLocale();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/company/jobs", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load jobs");
          return;
        }
        setJobs((data.jobs ?? []) as JobPosting[]);
      } catch {
        if (!cancelled) setError("Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{t("company.jobsPage.title")}</h1>
          <p className="text-sm text-slate-500">{t("company.jobsPage.subtitle")}</p>
        </div>
        <Link
          href="/company/dashboard/jobs/new"
          className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("company.jobsPage.postJob")}
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading jobs…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No jobs posted yet.</p>
          <Link
            href="/company/dashboard/jobs/new"
            className="mt-4 inline-block text-sm font-semibold text-[#3B5998] hover:underline"
          >
            Post your first job
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-semibold text-[#0F172A]">{job.title}</h2>
              <p className="text-xs text-slate-500">
                {job.location} ·{" "}
                {t("company.jobsPage.applications").replace("{count}", String(job.applicationCount))}
                {job.requireVideoPitch && ` · 🎬 ${t("company.jobsPage.videoRequired")}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={getAtsUrl(job.id)}
                className="rounded-lg border border-[#3B5998]/30 bg-[#3B5998]/5 px-4 py-2 text-xs font-semibold text-[#3B5998] hover:bg-[#3B5998]/10"
              >
                {t("company.jobsPage.atsPipeline")}
              </Link>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {job.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
