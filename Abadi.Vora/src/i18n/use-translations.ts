"use client";

import { useLocale } from "@/providers/LocaleProvider";
import type { Locale } from "@/i18n/config";

export function useTranslations() {
  const { t, locale, dir, setLocale, ready } = useLocale();
  return { t, locale, dir, setLocale, ready };
}

export type { Locale };
