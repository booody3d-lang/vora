"use client";

import Link from "next/link";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { DualDashboardToggle } from "@/components/navigation/DualDashboardToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useTranslations } from "@/i18n/use-translations";

export function LandingHeader() {
  const { t } = useTranslations();

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <VoraLogo variant="light" />
        <DualDashboardToggle />
        <nav className="hidden items-center gap-4 md:flex">
          <LocaleSwitcher variant="light" />
          <Link
            href="/auth/login"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            {t("common.signIn")}
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] transition-opacity hover:opacity-90"
          >
            {t("common.getStarted")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
