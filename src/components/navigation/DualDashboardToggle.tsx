"use client";

import Link from "next/link";
import { usePlatform } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

export function DualDashboardToggle({ className }: { className?: string }) {
  const { platform, setPlatform } = usePlatform();
  const { t } = useTranslations();

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-white/15 bg-black/20 p-1 backdrop-blur-md",
        className
      )}
      role="tablist"
      aria-label={t("common.platformSwitcher")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={platform === "network"}
        onClick={() => setPlatform("network")}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-all",
          platform === "network"
            ? "bg-[#3B5998] text-white shadow-lg"
            : "text-white/70 hover:text-white"
        )}
      >
        {t("common.network")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={platform === "freelance"}
        onClick={() => setPlatform("freelance")}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-all",
          platform === "freelance"
            ? "bg-[#EA580C] text-white shadow-lg"
            : "text-white/70 hover:text-white"
        )}
      >
        {t("common.freelance")}
      </button>
    </div>
  );
}

interface CrossPlatformLinkProps {
  type: "visit-store" | "professional-profile";
  href: string;
  className?: string;
}

export function CrossPlatformLink({ type, href, className }: CrossPlatformLinkProps) {
  const { t } = useTranslations();
  const label =
    type === "visit-store" ? t("common.visitStore") : t("common.professionalProfile");

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
        type === "visit-store"
          ? "border-[#EA580C]/30 bg-[#EA580C]/10 text-[#EA580C] hover:bg-[#EA580C]/20"
          : "border-[#3B5998]/30 bg-[#3B5998]/10 text-[#3B5998] hover:bg-[#3B5998]/20",
        className
      )}
    >
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
