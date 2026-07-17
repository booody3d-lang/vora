"use client";

import { useLocale } from "@/providers/LocaleProvider";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

interface LocaleSwitcherProps {
  variant?: "light" | "dark" | "pill";
}

export function LocaleSwitcher({ variant = "pill" }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale();

  function toggle() {
    setLocale(locale === "en" ? "ar" : "en");
  }

  const label = locale === "en" ? LOCALE_LABELS.ar : LOCALE_LABELS.en;

  const className =
    variant === "light"
      ? "rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
      : variant === "dark"
        ? "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-slate-200";

  return (
    <button type="button" onClick={toggle} className={className} aria-label="Switch language">
      {label}
    </button>
  );
}

export function LocaleTabs({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {(["en", "ar"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
            value === l ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500"
          }`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
