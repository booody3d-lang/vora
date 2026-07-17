import {
  DEFAULT_LOCALE,
  LOCALES,
  coerceLocale,
  isValidLocale,
  type Locale,
} from "@/i18n/config";

const LOCALE_SEGMENT = LOCALES.join("|");
const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALE_SEGMENT})(?=/|$)`);

export { coerceLocale };

/** Normalize pathname; never throws */
export function safePathname(pathname: unknown): string {
  if (typeof pathname !== "string" || pathname.length === 0) return "/";
  if (!pathname.startsWith("/")) return `/${pathname}`;
  return pathname;
}

/** Paths that should not receive locale prefix handling */
export function shouldLocalizePath(pathname: unknown): boolean {
  try {
    const path = safePathname(pathname);
    if (path.startsWith("/api/")) return false;
    if (path.startsWith("/_next/")) return false;
    if (path === "/robots.txt" || path === "/sitemap.xml") return false;
    if (path.startsWith("/brand/")) return false;
    if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

export function getLocaleFromPathname(pathname: unknown): Locale | null {
  try {
    const path = safePathname(pathname);
    const match = path.match(LOCALE_PREFIX_RE);
    if (!match?.[1]) return null;
    return isValidLocale(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Remove all leading /en or /ar segments so internal routing never double-prefixes.
 * Always returns a path starting with "/".
 */
export function stripLocalePrefix(pathname: unknown): string {
  try {
    let result = safePathname(pathname);
    let stripped = result.replace(LOCALE_PREFIX_RE, "");
    stripped = stripped === "" ? "/" : stripped;

    while (stripped !== result) {
      result = stripped;
      stripped = result.replace(LOCALE_PREFIX_RE, "");
      stripped = stripped === "" ? "/" : stripped;
    }

    return result;
  } catch {
    return "/";
  }
}

/** Build a locale-prefixed public URL path — always returns a valid string */
export function localizePath(pathname: unknown, locale: unknown): string {
  try {
    const safeLocale = coerceLocale(locale);
    const bare = stripLocalePrefix(pathname);
    if (bare === "/") return `/${safeLocale}`;
    return `/${safeLocale}${bare}`;
  } catch {
    return `/${DEFAULT_LOCALE}`;
  }
}

/** True when redirecting would change the pathname (prevents redirect loops) */
export function needsLocaleRedirect(pathname: unknown, locale: unknown): boolean {
  try {
    const path = safePathname(pathname);
    const target = localizePath(path, locale);
    return target !== path;
  } catch {
    return false;
  }
}
