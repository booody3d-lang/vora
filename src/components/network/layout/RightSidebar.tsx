"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecommendedJob } from "@/types/network";
import { useTranslations } from "@/i18n/use-translations";

const MatchmakingPanel = dynamic(
  () => import("@/components/ai/MatchmakingPanel").then((mod) => mod.MatchmakingPanel),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-6 text-center text-xs text-violet-600">
        Loading VORA AI…
      </div>
    ),
  }
);

export function RightSidebar() {
  const { t } = useTranslations();
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/jobs", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setJobs(data.jobs ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="space-y-4">
      <MatchmakingPanel />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-[#0F172A]">{t("network.trendingInsights")}</h2>
        </div>
        <div className="px-4 py-6 text-center text-sm text-slate-400">
          {t("network.insightsEmpty")}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-[#0F172A]">{t("network.recommendedJobs")}</h2>
        </div>
        {jobs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            {t("network.jobsEmptyBody")}
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/network/jobs/${job.slug}`}
                  className="block px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-[#0F172A]">{job.title}</p>
                  <p className="text-xs text-[#3B5998]">{job.company}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {job.location} · {job.employmentType}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/network/jobs"
          className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-[#3B5998] hover:bg-slate-50"
        >
          {t("network.viewAllJobs")}
        </Link>
      </div>
    </aside>
  );
}
