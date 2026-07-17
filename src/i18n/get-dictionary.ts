import type { Locale } from "@/i18n/config";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

/** Resolve dot-notation key: "marketplace.title" */
export function translate(dict: Dictionary, key: string): string {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

/** Replace {name} placeholders in translated strings */
export function formatTranslation(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

/** Backward-compatible flat key map for legacy t("marketplace.title") calls */
export function flattenDictionary(dict: Dictionary): Record<string, string> {
  const flat: Record<string, string> = {};
  function walk(obj: Record<string, unknown>, prefix = "") {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") flat[path] = v;
      else if (v && typeof v === "object") walk(v as Record<string, unknown>, path);
    }
  }
  walk(dict as unknown as Record<string, unknown>);
  return flat;
}
