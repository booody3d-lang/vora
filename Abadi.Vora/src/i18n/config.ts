export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "vora_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/** Future languages — add JSON file + entry here, no core code changes */
export const FUTURE_LOCALES = ["fr", "ur", "es"] as const;

export function isValidLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ar";
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

/** Always returns a valid locale — never undefined */
export function coerceLocale(value: unknown): Locale {
  if (typeof value === "string" && isValidLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vora.sa";
