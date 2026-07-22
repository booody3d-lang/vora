"use client";

import { useTranslations } from "@/i18n/use-translations";
import { SiteFooter } from "@/components/layout/SiteFooter";

function LegalSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </section>
  );
}

export default function PrivacyPage() {
  const { t } = useTranslations();

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold text-[#0F172A]">{t("legal.privacy.title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("legal.privacy.lastUpdated")}</p>
        <LegalSection title={t("legal.privacy.section1Title")} body={t("legal.privacy.section1Body")} />
        <LegalSection title={t("legal.privacy.section2Title")} body={t("legal.privacy.section2Body")} />
        <LegalSection title={t("legal.privacy.section3Title")} body={t("legal.privacy.section3Body")} />
        <LegalSection title={t("legal.privacy.section4Title")} body={t("legal.privacy.section4Body")} />
      </main>
      <SiteFooter />
    </>
  );
}
