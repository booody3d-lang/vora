"use client";

import { DualHero } from "@/components/landing/DualHero";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingSearchBridge } from "@/components/landing/LandingSearchBridge";
import { useLocale } from "@/providers/LocaleProvider";

export function LandingHome() {
  const { t } = useLocale();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617]">
      <LandingHeader />
      <LandingSearchBridge />
      <DualHero />
      <section className="border-t border-white/10 bg-[#0F172A] px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <FeatureCard title={t("landing.featureDual")} description={t("landing.featureDualDesc")} />
          <FeatureCard title={t("landing.featureSeparated")} description={t("landing.featureSeparatedDesc")} />
          <FeatureCard title={t("landing.featureScore")} description={t("landing.featureScoreDesc")} />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </article>
  );
}
