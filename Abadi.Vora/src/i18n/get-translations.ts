import { cookies } from "next/headers";
import { LOCALE_COOKIE, coerceLocale, type Locale } from "@/i18n/config";
import { buildTranslator } from "@/i18n/create-translator";

export async function getTranslations(forcedLocale?: Locale) {
  let locale = coerceLocale(forcedLocale);

  if (!forcedLocale) {
    try {
      const cookieStore = await cookies();
      locale = coerceLocale(cookieStore.get(LOCALE_COOKIE)?.value);
    } catch {
      // Ignore cookie read failures during static generation
    }
  }

  return {
    t: buildTranslator(locale),
    locale,
  };
}
