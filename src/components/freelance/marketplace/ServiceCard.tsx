"use client";

import Link from "next/link";
import type { MarketplaceService } from "@/types/freelance";
import { getServiceUrl } from "@/lib/freelance/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import { ReportButton } from "@/components/security/ReportButton";

interface ServiceCardProps {
  service: MarketplaceService;
  size?: "default" | "large";
}

export function ServiceCard({ service, size = "default" }: ServiceCardProps) {
  const { t } = useTranslations();

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${size === "large" ? "sm:col-span-2" : ""}`}>
      <div className="absolute right-2 top-2 z-10">
        <ReportButton targetType="service" targetId={service.id} targetLabel={service.title} />
      </div>
      <Link href={getServiceUrl(service.slug)} className="block">
        <div className="relative">
          <img
            src={service.thumbnailUrl}
            alt={service.title}
            className={`w-full object-cover ${size === "large" ? "h-52" : "h-40"}`}
          />
          {(service.isSponsored || service.isFeatured) && (
            <span className="absolute left-3 top-3 rounded-full bg-[#EA580C] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {service.isSponsored ? t("marketplace.sponsored") : t("marketplace.featuredBadge")}
            </span>
          )}
          {service.isNew && (
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {t("marketplace.newBadge")}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-semibold text-[#0F172A] group-hover:text-[#EA580C]">
            {service.title}
          </h3>
          <p className="mt-1 flex items-center gap-2">
            <img src={service.sellerAvatar} alt="" className="h-5 w-5 rounded-full" />
            <span className="text-xs text-slate-500">{service.storeName}</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{t("marketplace.startingAt")}</p>
              <p className="text-lg font-bold text-[#EA580C]">SAR {service.price}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-amber-500">★ {service.rating.toFixed(1)}</p>
              <p className="text-[10px] text-slate-400">({service.reviewCount})</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

interface ServiceSectionProps {
  title: string;
  services: MarketplaceService[];
}

export function ServiceSection({ title, services }: ServiceSectionProps) {
  if (services.length === 0) return null;

  return (
    <section className="mb-10">
      {title && (
        <h2 className="mb-4 text-lg font-bold text-[#0F172A]">{title}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} size={service.isFeatured ? "large" : "default"} />
        ))}
      </div>
    </section>
  );
}
