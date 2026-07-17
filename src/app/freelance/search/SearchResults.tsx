"use client";

import { useSearchParams } from "next/navigation";
import { ServiceSection } from "@/components/freelance/marketplace/ServiceCard";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_SERVICES } from "@/lib/freelance/mock-data";

export default function SearchResults() {
  const { t } = useTranslations();
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";
  const results = DEMO_SERVICES.filter(
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
        <ServiceSection title="" services={results} />
      </div>
    </div>
  );
}
