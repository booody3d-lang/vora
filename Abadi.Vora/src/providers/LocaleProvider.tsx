"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_OPTIONS,
  getDirection,
  isValidLocale,
  type Locale,
} from "@/i18n/config";
import {
  buildTranslator,
  getFallbackLocaleContext,
  type TranslateFn,
} from "@/i18n/create-translator";

export type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ready: boolean;
};

const LocaleContext = createContext<LocaleContextValue>(getFallbackLocaleContext());

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    const value = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (isValidLocale(value)) return value;
  } catch {
    // Ignore malformed cookies
  }

  return DEFAULT_LOCALE;
}

function writeCookieLocale(locale: Locale) {
  try {
    const { path, maxAge, sameSite } = LOCALE_COOKIE_OPTIONS;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
  } catch {
    // Ignore cookie write failures
  }
}

function applyDocumentLocale(locale: Locale) {
  try {
    const dir = getDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dataset.locale = locale;
  } catch {
    // Ignore DOM update failures
  }
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const resolved = readCookieLocale();
    setLocaleState(resolved);
    applyDocumentLocale(resolved);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!isValidLocale(next) || next === locale) return;

    setLocaleState(next);
    writeCookieLocale(next);
    applyDocumentLocale(next);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const t = buildTranslator(locale);
    return {
      locale,
      dir: getDirection(locale),
      setLocale,
      t,
      ready,
    };
  }, [locale, setLocale, ready]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Safe outside LocaleProvider — returns fallback context instead of throwing */
export function useLocale() {
  return useContext(LocaleContext);
}

export type { Locale };
