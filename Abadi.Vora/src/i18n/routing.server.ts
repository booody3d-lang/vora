import type { NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isValidLocale,
  type Locale,
} from "@/i18n/config";
import { getLocaleFromPathname } from "@/i18n/routing";

export function resolvePreferredLocale(
  request: NextRequest,
  langParam?: string | null
): Locale {
  try {
    if (isValidLocale(langParam)) return langParam;

    try {
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
      if (isValidLocale(cookieLocale)) return cookieLocale;
    } catch {
      // Malformed or unreadable cookies — ignore
    }

    const pathLocale = getLocaleFromPathname(request.nextUrl.pathname);
    if (pathLocale) return pathLocale;

    try {
      const acceptLanguage = request.headers.get("accept-language");
      if (typeof acceptLanguage === "string" && acceptLanguage.toLowerCase().includes("ar")) {
        return "ar";
      }
    } catch {
      // Unexpected Accept-Language header — ignore
    }

    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
