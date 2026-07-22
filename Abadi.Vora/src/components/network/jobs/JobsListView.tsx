"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/use-translations";

interface JobListing {
  id: string;
  slug: string;
  title: string;
  company: string;
  companySlug?: string;
  location: string;
  employmentType: string;
}

export function JobsListView() {
  const { t } = useTranslations();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/jobs", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setJobs(data.jobs ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">{t("network.jobsTitle")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("network.jobsSubtitle")}</p>

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-[#0F172A]">{t("network.jobsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("network.jobsEmptyBody")}</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <ul className="mt-6 space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/network/jobs/${job.slug}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="font-semibold text-[#0F172A]">{job.title}</h2>
                <p className="text-sm text-[#3B5998]">{job.company}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {job.location} · {job.employmentType}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
