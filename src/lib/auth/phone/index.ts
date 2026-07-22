export {
  DEFAULT_COUNTRY_ISO2,
  getCountryByDialCode,
  getCountryByIso2,
  listCountriesForLocale,
  PHONE_COUNTRIES,
} from "@/lib/auth/phone/countries";
export {
  detectCountryFromLocale,
  detectCountryFromRequest,
  detectCountryFromTimezone,
  detectInitialCountryIso2,
  normalizePhoneFromRequest,
  persistCountryIso2,
  readStoredCountryIso2,
  PHONE_COUNTRY_COOKIE,
  PHONE_COUNTRY_STORAGE_KEY,
} from "@/lib/auth/phone/detect-country";
export {
  buildPhoneInputValue,
  formatNationalPlaceholder,
  normalizePhone,
} from "@/lib/auth/phone/normalize";
