import { DEFAULT_COUNTRY_ISO2, getCountryByIso2 } from "@/lib/auth/phone/countries";
import { normalizePhone } from "@/lib/auth/phone/normalize";

export const PHONE_COUNTRY_COOKIE = "vora_phone_country";
export const PHONE_COUNTRY_STORAGE_KEY = "vora_phone_country";

const LOCALE_COUNTRY_MAP: Record<string, string> = {
  SA: "SA",
  AE: "AE",
  KW: "KW",
  BH: "BH",
  OM: "OM",
  QA: "QA",
  EG: "EG",
  JO: "JO",
  LB: "LB",
  IQ: "IQ",
  US: "US",
  GB: "GB",
  CA: "CA",
  AU: "AU",
  DE: "DE",
  FR: "FR",
  IN: "IN",
  PK: "PK",
  TR: "TR",
};

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  "Asia/Riyadh": "SA",
  "Asia/Dubai": "AE",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Qatar": "QA",
  "Africa/Cairo": "EG",
};

export function detectCountryFromLocale(locale?: string | null): string {
  if (!locale) return DEFAULT_COUNTRY_ISO2;

  const normalized = locale.replace("_", "-");
  const region = normalized.split("-")[1]?.toUpperCase();
  if (region && LOCALE_COUNTRY_MAP[region]) {
    return LOCALE_COUNTRY_MAP[region];
  }

  if (normalized.startsWith("ar")) return DEFAULT_COUNTRY_ISO2;
  return DEFAULT_COUNTRY_ISO2;
}

export function detectCountryFromTimezone(timeZone?: string | null): string | null {
  if (!timeZone) return null;
  return TIMEZONE_COUNTRY_MAP[timeZone] ?? null;
}

export function readStoredCountryIso2(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = window.localStorage.getItem(PHONE_COUNTRY_STORAGE_KEY);
    if (fromStorage && getCountryByIso2(fromStorage)) return fromStorage.toUpperCase();
  } catch {
    // ignore storage failures
  }

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${PHONE_COUNTRY_COOKIE}=([A-Z]{2})`)
  );
  if (cookieMatch?.[1] && getCountryByIso2(cookieMatch[1])) {
    return cookieMatch[1].toUpperCase();
  }

  return null;
}

export function persistCountryIso2(iso2: string): void {
  if (typeof window === "undefined") return;
  const normalized = iso2.toUpperCase();
  if (!getCountryByIso2(normalized)) return;

  try {
    window.localStorage.setItem(PHONE_COUNTRY_STORAGE_KEY, normalized);
  } catch {
    // ignore storage failures
  }

  document.cookie = `${PHONE_COUNTRY_COOKIE}=${normalized}; path=/; max-age=31536000; SameSite=Lax`;
}

export function detectInitialCountryIso2(): string {
  if (typeof window === "undefined") return DEFAULT_COUNTRY_ISO2;

  return (
    readStoredCountryIso2() ??
    detectCountryFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) ??
    detectCountryFromLocale(window.navigator.language) ??
    DEFAULT_COUNTRY_ISO2
  );
}

export function detectCountryFromRequest(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(
    new RegExp(`(?:^|; )${PHONE_COUNTRY_COOKIE}=([A-Z]{2})`)
  );
  if (cookieMatch?.[1] && getCountryByIso2(cookieMatch[1])) {
    return cookieMatch[1].toUpperCase();
  }

  const acceptLanguage = request.headers.get("accept-language");
  return detectCountryFromLocale(acceptLanguage?.split(",")[0]?.trim());
}

export function normalizePhoneFromRequest(
  rawInput: string,
  request: Request,
  explicitCountryIso2?: string
) {
  const countryIso2 = explicitCountryIso2?.toUpperCase() ?? detectCountryFromRequest(request);
  return normalizePhone(rawInput, countryIso2);
}
