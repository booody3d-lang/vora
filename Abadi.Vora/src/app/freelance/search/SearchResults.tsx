"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceSection } from "@/components/freelance/marketplace/ServiceCard";
import { useTranslations } from "@/i18n/use-translations";
import type { MarketplaceService } from "@/types/freelance";

export default function SearchResults() {
  const { t } = useTranslations();
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const [services, setServices] = useState<MarketplaceService[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/marketplace/services")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setServices(data.services ?? []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = services.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.storeName.toLowerCase().includes(q) ||
      s.category.includes(q)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-xl font-bold text-[#0F172A]">
        {t("marketplace.searchResultsFor")} &quot;{params.get("q")}&quot;
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("marketplace.servicesFound", { count: results.length })}
      </p>
      <div className="mt-6">
        {results.length === 0 ? (
          <p className="text-sm text-slate-400">{t("marketplace.emptyBody")}</p>
        ) : (
          <ServiceSection title="" services={results} />
        )}
      </div>
    </div>
  );
}
