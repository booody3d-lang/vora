import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE, getDirection } from "@/i18n/config";
import {
  flattenDictionary,
  formatTranslation,
  getDictionary,
  translate,
  type Dictionary,
} from "@/i18n/get-dictionary";
import { resolveTranslationKey } from "@/i18n/legacy-keys";

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

/** Never throws — returns the key when lookup fails */
export function safeTranslate(
  dict: Dictionary,
  flat: Record<string, string>,
  key: string,
  vars?: Record<string, string | number>
): string {
  try {
    if (!key || typeof key !== "string") return "";
    const resolved = resolveTranslationKey(key);
    const raw =
      flat[resolved] ??
      flat[key] ??
      translate(dict, resolved) ??
      translate(dict, key) ??
      key;

    if (!vars) return raw;

    try {
      return formatTranslation(raw, vars);
    } catch {
      return raw;
    }
  } catch {
    return key;
  }
}

export function buildTranslator(locale: Locale): TranslateFn {
  try {
    const dict = getDictionary(locale);
    const flat = flattenDictionary(dict);
    return (key, vars) => safeTranslate(dict, flat, key, vars);
  } catch {
    return (key) => key;
  }
}

export const fallbackTranslate: TranslateFn = (key) => key;

export const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;

export function getFallbackLocaleContext() {
  return {
    locale: FALLBACK_LOCALE,
    dir: getDirection(FALLBACK_LOCALE) as "ltr" | "rtl",
    setLocale: () => {},
    t: fallbackTranslate,
    ready: false,
  };
}
