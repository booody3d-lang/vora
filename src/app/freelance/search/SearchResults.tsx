"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ServiceSection } from "@/components/freelance/marketplace/ServiceCard";
import { useTranslations } from "@/i18n/use-translations";
import type { FreelancerStore, MarketplaceService } from "@/types/freelance";

export default function SearchResults() {
  const { t } = useTranslations();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [stores, setStores] = useState<FreelancerStore[]>([]);

  useEffect(() => {
    let cancelled = false;
    const query = q.trim();
    const url = query
      ? `/api/freelance/search?q=${encodeURIComponent(query)}`
      : "/api/marketplace/services";

    void fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (query) {
          setServices(data.services ?? []);
          setStores(data.stores ?? []);
        } else {
          setServices(data.services ?? []);
          setStores([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServices([]);
          setStores([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-xl font-bold text-[#0F172A]">
        {t("marketplace.searchResultsFor")} &quot;{params.get("q")}&quot;
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("marketplace.servicesFound", { count: services.length })}
      </p>

      {stores.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Stores</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <li key={store.id}>
                <Link
                  href={`/freelance/store/${store.slug}`}
                  className="block rounded-xl border border-orange-100 bg-white p-4 hover:border-[#EA580C]/30"
                >
                  <p className="font-semibold text-[#0F172A]">{store.storeName}</p>
                  <p className="mt-1 text-sm text-slate-500">{store.tagline}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        {services.length === 0 ? (
          <p className="text-sm text-slate-400">{t("marketplace.emptyBody")}</p>
        ) : (
          <ServiceSection title="" services={services} />
        )}
      </div>
    </div>
  );
}
