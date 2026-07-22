"use client";

import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  variant?: "network" | "freelance" | "company";
}

const VARIANT_STYLES = {
  network: "border-slate-700 bg-[#0F172A] text-slate-300 hover:bg-slate-800 hover:text-white",
  freelance: "border-orange-200 bg-white text-[#EA580C] hover:bg-orange-50",
  company: "border-slate-700 bg-[#0F172A] text-slate-300 hover:bg-slate-800 hover:text-white",
};

export function SidebarToggle({ isOpen, onToggle, variant = "network" }: SidebarToggleProps) {
  const { t, dir } = useLocale();
  const isRtl = dir === "rtl";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? t("sidebar.collapse") : t("sidebar.expand")}
      className={cn(
        "fixed top-[4.5rem] z-50 flex h-9 w-9 items-center justify-center rounded-e-lg border shadow-md transition-[inset-inline-start] duration-300 ease-in-out",
        isOpen ? "start-64" : "start-0",
        VARIANT_STYLES[variant]
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn(
          "transition-transform duration-300",
          isOpen
            ? isRtl
              ? ""
              : "rotate-180"
            : isRtl
              ? "rotate-180"
              : ""
        )}
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
