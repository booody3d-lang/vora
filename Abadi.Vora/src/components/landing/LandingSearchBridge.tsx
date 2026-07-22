"use client";

import { DynamicSearchBar } from "@/components/landing/DynamicSearchBar";
import { useTranslations } from "@/i18n/use-translations";

export function LandingSearchBridge() {
  const { t } = useTranslations();

  return (
    <section
      aria-label={t("common.search")}
      className="relative z-20 border-b border-white/10"
    >
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-gradient-to-r from-[#1E293B] to-[#3B5998]/80" />
        <div className="hidden w-px shrink-0 bg-white/20 lg:block" aria-hidden="true" />
        <div className="flex-1 bg-gradient-to-l from-[#C2410C] to-[#F59E0B]/80" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-8 pt-24 md:px-8 md:pb-10 md:pt-28">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {t("landing.oneAccount")}
        </p>
        <h1 className="mx-auto mb-6 max-w-2xl text-center text-xl font-bold text-white md:text-3xl">
          {t("landing.premiumEcosystem")}
        </h1>

        <div className="relative mx-auto max-w-3xl">
          <div
            className="pointer-events-none absolute -inset-1 rounded-2xl opacity-60 blur-sm"
            style={{
              background: `linear-gradient(90deg, #3B5998 0%, #475569 50%, #EA580C 100%)`,
            }}
            aria-hidden="true"
          />
          <DynamicSearchBar className="relative shadow-2xl" />
        </div>
      </div>
    </section>
  );
}
