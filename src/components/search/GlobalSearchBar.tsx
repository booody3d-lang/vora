"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "profile" | "job" | "company";
  slug: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  profile: "Profile",
  job: "Job",
  company: "Company",
};

interface GlobalSearchBarProps {
  variant?: "nav" | "sidebar" | "page";
  className?: string;
}

export function GlobalSearchBar({ variant = "nav", className }: GlobalSearchBarProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/network/search?q=${encodeURIComponent(trimmed)}`);
  }

  const isDarkDropdown = variant === "nav" || variant === "sidebar";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <span
          className={cn(
            "pointer-events-none absolute start-3 top-1/2 -translate-y-1/2",
            variant === "sidebar" ? "text-slate-400" : "text-slate-400"
          )}
        >
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={t("search.globalPlaceholder")}
          className={cn(
            "w-full rounded-full border ps-10 pe-4 outline-none transition-colors",
            variant === "nav" &&
              "min-h-11 border-white/20 bg-white/10 py-2.5 text-base text-white placeholder:text-slate-300 focus:border-[#3B5998] focus:bg-white/15",
            variant === "sidebar" &&
              "min-h-11 border-slate-700 bg-slate-800/80 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-[#3B5998] focus:bg-slate-800",
            variant === "page" &&
              "border-slate-200 bg-white py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#3B5998]"
          )}
        />
      </form>

      {open && (results.length > 0 || loading || query.trim()) && (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 max-h-80 w-full overflow-y-auto rounded-xl border shadow-xl",
            isDarkDropdown ? "border-slate-700 bg-[#0F172A]" : "border-slate-200 bg-white"
          )}
        >
          {loading && (
            <p className={cn("px-4 py-3 text-sm", isDarkDropdown ? "text-slate-400" : "text-slate-500")}>
              {t("common.loading")}
            </p>
          )}
          {!loading &&
            results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  isDarkDropdown ? "hover:bg-white/5" : "hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    result.type === "profile" && "bg-[#3B5998]/20 text-[#93C5FD]",
                    result.type === "job" && "bg-emerald-500/20 text-emerald-300",
                    result.type === "company" && "bg-violet-500/20 text-violet-300"
                  )}
                >
                  {TYPE_LABELS[result.type]}
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", isDarkDropdown ? "text-white" : "text-slate-900")}>
                    {result.title}
                  </p>
                  <p className={cn("truncate text-xs", isDarkDropdown ? "text-slate-400" : "text-slate-500")}>
                    {result.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          {!loading && results.length === 0 && query.trim() && (
            <p className={cn("px-4 py-3 text-sm", isDarkDropdown ? "text-slate-400" : "text-slate-500")}>
              {t("search.noResults")}
            </p>
          )}
          {!loading && query.trim() && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/network/search?q=${encodeURIComponent(query.trim())}`);
              }}
              className={cn(
                "w-full border-t px-4 py-2 text-start text-xs font-medium",
                isDarkDropdown
                  ? "border-slate-700 text-[#93C5FD] hover:bg-white/5"
                  : "border-slate-100 text-[#3B5998] hover:bg-slate-50"
              )}
            >
              {t("search.viewAll")} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
