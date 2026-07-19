"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";
import { useTranslations } from "@/i18n/use-translations";

interface SearchResult {
  id: string;
  type: "profile" | "job" | "company";
  title: string;
  subtitle: string;
  href: string;
}

export function NetworkSearchResults() {
  const searchParams = useSearchParams();
  const { t } = useTranslations();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-[#0F172A]">{t("search.resultsTitle")}</h1>
      <GlobalSearchBar variant="page" className="mb-8" />
      {loading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-slate-500">{t("search.noResults")}</p>
      )}
      <ul className="space-y-3">
        {results.map((result) => (
          <li key={result.id}>
            <Link
              href={result.href}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3B5998]">
                {result.type}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#0F172A]">{result.title}</p>
              <p className="text-sm text-slate-500">{result.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
