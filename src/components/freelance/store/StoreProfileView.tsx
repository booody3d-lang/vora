"use client";

import { useState } from "react";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";
import { PremiumBadge } from "@/components/billing/PremiumBadge";
import { ServiceCard } from "@/components/freelance/marketplace/ServiceCard";
import type { FreelancerStore, MarketplaceService, PortfolioItem, StoreReview, StoreTab } from "@/types/freelance";
import { getProfileUrl } from "@/lib/network/mock-data";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

interface StoreProfileViewProps {
  store: FreelancerStore;
  services: MarketplaceService[];
  portfolio: PortfolioItem[];
  reviews: StoreReview[];
}

export function StoreProfileView({ store, services, portfolio, reviews }: StoreProfileViewProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<StoreTab>("services");

  const tabs: { id: StoreTab; label: string }[] = [
    { id: "services", label: t("store.services") },
    { id: "portfolio", label: t("store.portfolio") },
    { id: "reviews", label: t("store.reviews") },
    { id: "video", label: t("store.video") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Store banner */}
      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="relative h-44 bg-gradient-to-r from-[#C2410C] to-[#F59E0B] md:h-52">
          {store.coverImageUrl && (
            <img src={store.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="relative px-5 pb-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <img
                src={store.logoUrl}
                alt={store.storeName}
                className="-mt-10 h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover md:-mt-12 md:h-24 md:w-24"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#0F172A] md:text-2xl">{store.storeName}</h1>
                  {store.isPremium && <PremiumBadge />}
                  {store.isVerified && (
                    <span className="rounded-full bg-[#EA580C]/10 px-2 py-0.5 text-[10px] font-bold text-[#EA580C]">✓ Verified</span>
                  )}
                </div>
                {store.tagline && <p className="text-sm text-slate-500">{store.tagline}</p>}
                <p className="mt-1 text-xs text-amber-500">★ {store.ratingAvg} ({store.totalReviews} reviews)</p>
              </div>
            </div>
            {store.professionalProfileSlug && (
              <CrossPlatformLink
                type="professional-profile"
                href={getProfileUrl(store.professionalProfileSlug)}
              />
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{store.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <nav className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 px-5 py-3 text-sm font-medium",
                activeTab === tab.id ? "border-b-2 border-[#EA580C] text-[#EA580C]" : "text-slate-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-5">
          {activeTab === "services" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
          {activeTab === "portfolio" && (
            <div className="columns-2 gap-3 md:columns-3">
              {portfolio.map((item) => (
                <div key={item.id} className="mb-3 break-inside-avoid overflow-hidden rounded-xl">
                  <img src={item.imageUrl} alt={item.title} className="w-full rounded-xl object-cover" />
                  <p className="mt-1 px-1 text-xs font-medium text-slate-600">{item.title}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === "reviews" && (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <img src={r.buyerAvatar} alt="" className="h-10 w-10 rounded-full" />
                    <div>
                      <p className="font-medium text-[#0F172A]">{r.buyerName}</p>
                      <p className="text-xs text-slate-400">{r.serviceTitle}</p>
                    </div>
                    <span className="ms-auto text-sm text-amber-500">
                      ★ {((r.overallQuality + r.communication + r.deliveryPunctuality) / 3).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.publicReview}</p>
                </li>
              ))}
            </ul>
          )}
          {activeTab === "video" && store.videoIntroUrl && (
            <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-black">
              <video src={store.videoIntroUrl} controls className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
