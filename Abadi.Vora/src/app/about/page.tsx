"use client";

import { useTranslations } from "@/i18n/use-translations";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function AboutPage() {
  const { t } = useTranslations();

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold text-[#0F172A]">{t("legal.about.title")}</h1>
        <p className="mt-2 text-lg text-slate-600">{t("legal.about.subtitle")}</p>

        <section className="mt-10 space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0F172A]">{t("legal.about.missionTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("legal.about.missionBody")}</p>
          </article>
          <article className="rounded-2xl border border-[#3B5998]/20 bg-[#3B5998]/5 p-6">
            <h2 className="text-xl font-bold text-[#3B5998]">{t("legal.about.networkTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("legal.about.networkBody")}</p>
          </article>
          <article className="rounded-2xl border border-[#EA580C]/20 bg-orange-50 p-6">
            <h2 className="text-xl font-bold text-[#EA580C]">{t("legal.about.freelanceTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("legal.about.freelanceBody")}</p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
