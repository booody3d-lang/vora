"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";

interface HeroPanelProps {
  side: "left" | "right";
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  theme: "network" | "freelance";
  sectionLabel: string;
}

function HeroPanel({ side, title, subtitle, cta, href, theme, sectionLabel }: HeroPanelProps) {
  const isNetwork = theme === "network";

  return (
    <section
      className={cn(
        "relative flex min-h-[45vh] flex-1 flex-col justify-between overflow-hidden p-8 md:min-h-[55vh] md:p-12 lg:p-14",
        isNetwork
          ? "bg-gradient-to-br from-[#1E293B] via-[#3B5998] to-[#475569]"
          : "bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#F59E0B]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-25",
          side === "left"
            ? "bg-[radial-gradient(circle_at_20%_30%,#64748B_0%,transparent_55%)]"
            : "bg-[radial-gradient(circle_at_80%_70%,#FBBF24_0%,transparent_55%)]"
        )}
      />
      <div className="relative z-10">
        <span
          className={cn(
            "inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest",
            isNetwork ? "bg-white/10 text-slate-300" : "bg-white/15 text-amber-100"
          )}
        >
          {sectionLabel}
        </span>
        <h2 className="mt-5 max-w-lg text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-white/80 md:text-lg">
          {subtitle}
        </p>
      </div>
      <div className="relative z-10 mt-6">
        <Link
          href={href}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
            isNetwork
              ? "bg-white text-[#1E293B] hover:bg-white/90"
              : "bg-[#1E293B] text-white hover:bg-[#1E293B]/90"
          )}
        >
          {cta}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

export function DualHero() {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col lg:flex-row">
      <HeroPanel
        side="left"
        theme="network"
        sectionLabel={t("landing.section1")}
        title={t("landing.networkTitle")}
        subtitle={t("landing.networkSubtitle")}
        cta={t("landing.exploreNetwork")}
        href="/network"
      />
      <HeroPanel
        side="right"
        theme="freelance"
        sectionLabel={t("landing.section2")}
        title={t("landing.freelanceTitle")}
        subtitle={t("landing.freelanceSubtitle")}
        cta={t("landing.exploreMarketplace")}
        href="/freelance"
      />
    </div>
  );
}
