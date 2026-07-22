"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SearchMode } from "@/types/vora";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

export function DynamicSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [mode, setMode] = useState<SearchMode>("jobs");
  const [query, setQuery] = useState("");

  const searchOptions: { value: SearchMode; labelKey: string }[] = [
    { value: "jobs", labelKey: "landing.searchJobs" },
    { value: "services", labelKey: "landing.searchFreelance" },
  ];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const base = mode === "jobs" ? "/network/search" : "/freelance/search";
    router.push(`${base}?q=${encodeURIComponent(trimmed)}`);
  }

  const isJobsMode = mode === "jobs";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-white/20 bg-white/95 p-2 shadow-xl sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="relative min-w-[200px]">
        <label htmlFor="search-mode" className="sr-only">
          {t("common.search")}
        </label>
        <select
          id="search-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as SearchMode)}
          className={cn(
            "w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm font-semibold outline-none",
            isJobsMode
              ? "border-[#3B5998]/20 bg-[#F1F5F9] text-[#1E293B] focus:border-[#3B5998]"
              : "border-[#EA580C]/20 bg-[#FFFBEB] text-[#9A3412] focus:border-[#EA580C]"
          )}
        >
          {searchOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className="flex flex-1 items-center gap-2">
        <label htmlFor="search-query" className="sr-only">
          {t("common.search")}
        </label>
        <input
          id="search-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            mode === "jobs"
              ? t("landing.searchJobsPlaceholder")
              : t("landing.searchFreelancePlaceholder")
          }
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          className={cn(
            "rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90",
            isJobsMode ? "bg-[#3B5998]" : "bg-[#EA580C]"
          )}
        >
          {t("common.search")}
        </button>
      </div>
    </form>
  );
}
