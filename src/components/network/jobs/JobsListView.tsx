"use client";

import Link from "next/link";
import { DEMO_JOBS } from "@/lib/network/mock-data";
import { useTranslations } from "@/i18n/use-translations";

export function JobsListView() {
  const { t } = useTranslations();

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">{t("network.jobsTitle")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("network.jobsSubtitle")}</p>
      <ul className="mt-6 space-y-3">
        {DEMO_JOBS.map((job) => (
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
    </div>
  );
}
