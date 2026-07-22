"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPhoneInputValue,
  formatNationalPlaceholder,
  getCountryByIso2,
  listCountriesForLocale,
  normalizePhone,
  persistCountryIso2,
} from "@/lib/auth/phone";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { PhoneInputValue } from "@/types/auth-phone";

interface PhoneInputProps {
  nationalNumber: string;
  countryIso2: string;
  onNationalNumberChange: (value: string) => void;
  onCountryChange: (iso2: string) => void;
  onValueChange?: (value: PhoneInputValue) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInput({
  nationalNumber,
  countryIso2,
  onNationalNumberChange,
  onCountryChange,
  onValueChange,
  disabled = false,
  className,
  id = "phone-input",
}: PhoneInputProps) {
  const { t, locale } = useTranslations();
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  const countries = useMemo(
    () => listCountriesForLocale(locale === "ar" ? "ar" : "en"),
    [locale]
  );

  const selectedCountry = getCountryByIso2(countryIso2) ?? countries[0];
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((country) => {
      const label = locale === "ar" ? country.nameAr : country.nameEn;
      return (
        label.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query) ||
        country.dialCode.includes(query.replace("+", ""))
      );
    });
  }, [countries, countryQuery, locale]);

  useEffect(() => {
    const payload: PhoneInputValue = {
      nationalNumber,
      countryIso2: selectedCountry.iso2,
      ...buildPhoneInputValue(nationalNumber, selectedCountry.iso2),
    };
    onValueChange?.(payload);
  }, [nationalNumber, onValueChange, selectedCountry.iso2]);

  function handleCountrySelect(iso2: string) {
    onCountryChange(iso2);
    persistCountryIso2(iso2);
    setCountryOpen(false);
    setCountryQuery("");
  }

  function handleNationalChange(nextValue: string) {
    onNationalNumberChange(nextValue.replace(/[^\d\s\-()]/g, ""));
  }

  function handlePaste(value: string) {
    const normalized = normalizePhone(value, selectedCountry.iso2);
    if (!normalized) return;
    onCountryChange(normalized.countryIso2);
    persistCountryIso2(normalized.countryIso2);
    onNationalNumberChange(normalized.nationalNumber);
  }

  const placeholder = formatNationalPlaceholder(selectedCountry.iso2);

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-xs text-slate-400">
        {t("auth.phoneNumber")}
      </label>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCountryOpen((open) => !open)}
            className="flex min-w-[7.5rem] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white focus:border-[#EA580C] focus:outline-none disabled:opacity-50"
            aria-haspopup="listbox"
            aria-expanded={countryOpen}
          >
            <span>{selectedCountry.flag}</span>
            <span className="font-medium">+{selectedCountry.dialCode}</span>
          </button>

          {countryOpen && (
            <div className="absolute z-20 mt-2 w-72 rounded-xl border border-slate-700 bg-[#0F172A] p-2 shadow-2xl">
              <input
                type="search"
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder={t("auth.searchCountry")}
                className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
              />
              <ul className="max-h-56 overflow-y-auto" role="listbox">
                {filteredCountries.map((country) => {
                  const label = locale === "ar" ? country.nameAr : country.nameEn;
                  return (
                    <li key={country.iso2}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={country.iso2 === selectedCountry.iso2}
                        onClick={() => handleCountrySelect(country.iso2)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                      >
                        <span>{country.flag}</span>
                        <span className="flex-1 truncate">{label}</span>
                        <span className="text-xs text-slate-500">+{country.dialCode}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={nationalNumber}
          onChange={(e) => handleNationalChange(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData("text"));
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#EA580C] focus:outline-none disabled:opacity-50"
        />
      </div>
      <p className="text-[10px] text-slate-500">
        {t("auth.countryRegion")}: {locale === "ar" ? selectedCountry.nameAr : selectedCountry.nameEn}
      </p>
    </div>
  );
}
