"use client";

import { useState } from "react";
import { MarketplaceSearch, CategoryBar } from "@/components/freelance/layout/MarketplaceNav";
import { ServiceSection } from "@/components/freelance/marketplace/ServiceCard";
import { DEMO_SERVICES, getServicesBySection } from "@/lib/freelance/mock-data";
import { useLocale } from "@/providers/LocaleProvider";
import type { MarketplaceService } from "@/types/freelance";

export default function FreelanceMarketplacePage() {
  const { t } = useLocale();
  const [category, setCategory] = useState("all");

  const filtered: MarketplaceService[] =
    category === "all"
      ? DEMO_SERVICES
      : DEMO_SERVICES.filter((s) => s.category === category);

  const sections = getServicesBySection(filtered);

  return (
    <>
      {/* Hero */}
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
        <ServiceSection title={t("section.featured")} services={sections.featured} />
        <ServiceSection title={t("section.bestSellers")} services={sections.bestSellers} />
        <ServiceSection title={t("section.topRated")} services={sections.topRated} />
        {sections.newArrivals.length > 0 && (
          <ServiceSection title={t("section.newArrivals")} services={sections.newArrivals} />
        )}
      </div>
    </>
  );
}
