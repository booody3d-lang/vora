"use client";

import { useEffect, useState } from "react";
import { MarketplaceSearch, CategoryBar } from "@/components/freelance/layout/MarketplaceNav";
import { ServiceSection } from "@/components/freelance/marketplace/ServiceCard";
import { useLocale } from "@/providers/LocaleProvider";
import type { MarketplaceService } from "@/types/freelance";

function getServicesBySection(services: MarketplaceService[]) {
  return {
    featured: services.slice(0, 4),
    bestSellers: services.slice(0, 6),
    topRated: services.filter((s) => s.rating >= 4.5).slice(0, 6),
    newArrivals: services.slice(-4),
  };
}

export default function FreelanceMarketplacePage() {
  const { t } = useLocale();
  const [category, setCategory] = useState("all");
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/marketplace/services")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setServices(data.services ?? []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    category === "all" ? services : services.filter((s) => s.category === category);
  const sections = getServicesBySection(filtered);

  return (
    <>
      <section className="bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#F59E0B] px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">{t("marketplace.title")}</h1>
          <p className="mt-2 text-sm text-orange-100 md:text-base">{t("marketplace.subtitle")}</p>
          <div className="mt-8">
            <MarketplaceSearch />
          </div>
        </div>
      </section>

      <CategoryBar active={category} onSelect={setCategory} />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {t("common.loading")}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-[#0F172A]">{t("marketplace.emptyTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("marketplace.emptyBody")}</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <>
            <ServiceSection title={t("section.featured")} services={sections.featured} />
            <ServiceSection title={t("section.bestSellers")} services={sections.bestSellers} />
            <ServiceSection title={t("section.topRated")} services={sections.topRated} />
            {sections.newArrivals.length > 0 && (
              <ServiceSection title={t("section.newArrivals")} services={sections.newArrivals} />
            )}
          </>
        )}
      </div>
    </>
  );
}
