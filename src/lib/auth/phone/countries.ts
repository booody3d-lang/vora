import type { CountryOption } from "@/types/auth-phone";

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function country(
  iso2: string,
  dialCode: string,
  nameEn: string,
  nameAr: string,
  nationalMinLength = 6,
  nationalMaxLength = 12
): CountryOption & { flag: string } {
  return {
    iso2,
    dialCode,
    nameEn,
    nameAr,
    nationalMinLength,
    nationalMaxLength,
    flag: flagEmoji(iso2),
  };
}

const RAW_COUNTRIES: Array<CountryOption & { flag: string }> = [
  country("SA", "966", "Saudi Arabia", "السعودية", 9, 9),
  country("AE", "971", "United Arab Emirates", "الإمارات", 9, 9),
  country("KW", "965", "Kuwait", "الكويت", 8, 8),
  country("BH", "973", "Bahrain", "البحرين", 8, 8),
  country("OM", "968", "Oman", "عُمان", 8, 8),
  country("QA", "974", "Qatar", "قطر", 8, 8),
  country("EG", "20", "Egypt", "مصر", 9, 10),
  country("JO", "962", "Jordan", "الأردن", 8, 9),
  country("LB", "961", "Lebanon", "لبنان", 7, 8),
  country("IQ", "964", "Iraq", "العراق", 9, 10),
  country("YE", "967", "Yemen", "اليمن", 9, 9),
  country("SY", "963", "Syria", "سوريا", 9, 9),
  country("PS", "970", "Palestine", "فلسطين", 9, 9),
  country("MA", "212", "Morocco", "المغرب", 9, 9),
  country("DZ", "213", "Algeria", "الجزائر", 9, 9),
  country("TN", "216", "Tunisia", "تونس", 8, 8),
  country("LY", "218", "Libya", "ليبيا", 9, 9),
  country("SD", "249", "Sudan", "السودان", 9, 9),
  country("TR", "90", "Turkey", "تركيا", 10, 10),
  country("PK", "92", "Pakistan", "باكستان", 10, 10),
  country("IN", "91", "India", "الهند", 10, 10),
  country("BD", "880", "Bangladesh", "بنغلاديش", 10, 10),
  country("PH", "63", "Philippines", "الفلبين", 10, 10),
  country("ID", "62", "Indonesia", "إندونيسيا", 9, 11),
  country("MY", "60", "Malaysia", "ماليزيا", 9, 10),
  country("GB", "44", "United Kingdom", "المملكة المتحدة", 10, 10),
  country("DE", "49", "Germany", "ألمانيا", 10, 11),
  country("FR", "33", "France", "فرنسا", 9, 9),
  country("IT", "39", "Italy", "إيطاليا", 9, 10),
  country("ES", "34", "Spain", "إسبانيا", 9, 9),
  country("NL", "31", "Netherlands", "هولندا", 9, 9),
  country("SE", "46", "Sweden", "السويد", 9, 10),
  country("NO", "47", "Norway", "النرويج", 8, 8),
  country("US", "1", "United States", "الولايات المتحدة", 10, 10),
  country("CA", "1", "Canada", "كندا", 10, 10),
  country("AU", "61", "Australia", "أستراليا", 9, 9),
  country("NZ", "64", "New Zealand", "نيوزيلندا", 8, 10),
  country("CN", "86", "China", "الصين", 11, 11),
  country("JP", "81", "Japan", "اليابان", 10, 10),
  country("KR", "82", "South Korea", "كوريا الجنوبية", 9, 10),
  country("SG", "65", "Singapore", "سنغافورة", 8, 8),
  country("ZA", "27", "South Africa", "جنوب أفريقيا", 9, 9),
  country("NG", "234", "Nigeria", "نيجيريا", 10, 10),
  country("KE", "254", "Kenya", "كينيا", 9, 9),
  country("BR", "55", "Brazil", "البرازيل", 10, 11),
  country("MX", "52", "Mexico", "المكسيك", 10, 10),
  country("AR", "54", "Argentina", "الأرجentin", 10, 10),
];

export const DEFAULT_COUNTRY_ISO2 = "SA";

export const PHONE_COUNTRIES: Array<CountryOption & { flag: string }> = RAW_COUNTRIES;

const byIso2 = new Map(PHONE_COUNTRIES.map((entry) => [entry.iso2, entry]));
const byDialCode = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

export function getCountryByIso2(iso2: string): (CountryOption & { flag: string }) | undefined {
  return byIso2.get(iso2.toUpperCase());
}

export function getCountryByDialCode(digits: string): (CountryOption & { flag: string }) | undefined {
  return byDialCode.find((entry) => digits.startsWith(entry.dialCode));
}

export function listCountriesForLocale(locale: "en" | "ar" = "en"): Array<CountryOption & { flag: string }> {
  return [...PHONE_COUNTRIES].sort((a, b) => {
    if (a.iso2 === DEFAULT_COUNTRY_ISO2) return -1;
    if (b.iso2 === DEFAULT_COUNTRY_ISO2) return 1;
    const labelA = locale === "ar" ? a.nameAr : a.nameEn;
    const labelB = locale === "ar" ? b.nameAr : b.nameEn;
    return labelA.localeCompare(labelB, locale === "ar" ? "ar" : "en");
  });
}
