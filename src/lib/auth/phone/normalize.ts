import {
  DEFAULT_COUNTRY_ISO2,
  getCountryByDialCode,
  getCountryByIso2,
} from "@/lib/auth/phone/countries";
import type { CountryOption, NormalizedPhone } from "@/types/auth-phone";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function stripNationalPrefix(nationalDigits: string): string {
  return nationalDigits.replace(/^0+/, "");
}

function isValidNationalLength(country: CountryOption, nationalDigits: string): boolean {
  const length = nationalDigits.length;
  if (length < country.nationalMinLength || length > country.nationalMaxLength) {
    return false;
  }

  if (country.iso2 === "SA") {
    return /^5[0-9]{8}$/.test(nationalDigits);
  }

  return length >= country.nationalMinLength;
}

export function normalizePhone(
  rawInput: string,
  defaultCountryIso2: string = DEFAULT_COUNTRY_ISO2
): NormalizedPhone | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let digits = digitsOnly(trimmed);
  if (!digits) return null;

  let country = getCountryByIso2(defaultCountryIso2) ?? getCountryByIso2(DEFAULT_COUNTRY_ISO2);
  if (!country) return null;

  if (trimmed.startsWith("+")) {
    const matched = getCountryByDialCode(digits);
    if (matched) {
      country = matched;
      const nationalDigits = stripNationalPrefix(digits.slice(matched.dialCode.length));
      if (!isValidNationalLength(country, nationalDigits)) return null;
      return {
        e164: `+${matched.dialCode}${nationalDigits}`,
        countryIso2: country.iso2,
        dialCode: country.dialCode,
        nationalNumber: nationalDigits,
      };
    }
    return null;
  }

  digits = stripNationalPrefix(digits);

  const matchedDial = getCountryByDialCode(digits);
  if (matchedDial && digits.length > matchedDial.dialCode.length) {
    country = matchedDial;
    const nationalDigits = stripNationalPrefix(digits.slice(matchedDial.dialCode.length));
    if (!isValidNationalLength(country, nationalDigits)) return null;
    return {
      e164: `+${matchedDial.dialCode}${nationalDigits}`,
      countryIso2: country.iso2,
      dialCode: country.dialCode,
      nationalNumber: nationalDigits,
    };
  }

  if (!isValidNationalLength(country, digits)) return null;

  return {
    e164: `+${country.dialCode}${digits}`,
    countryIso2: country.iso2,
    dialCode: country.dialCode,
    nationalNumber: digits,
  };
}

export function formatNationalPlaceholder(countryIso2: string): string {
  const country = getCountryByIso2(countryIso2);
  if (!country) return "501234567";
  if (country.iso2 === "SA") return "5XXXXXXXX";
  if (country.iso2 === "US" || country.iso2 === "CA") return "5551234567";
  return "0".repeat(country.nationalMinLength);
}

export function buildPhoneInputValue(
  nationalNumber: string,
  countryIso2: string
): { e164: string | null; isValid: boolean } {
  const normalized = normalizePhone(nationalNumber, countryIso2);
  return {
    e164: normalized?.e164 ?? null,
    isValid: Boolean(normalized),
  };
}
