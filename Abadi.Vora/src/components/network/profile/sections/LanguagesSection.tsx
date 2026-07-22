"use client";

import type { LanguageItem } from "@/types/network";
import { useLocale } from "@/providers/LocaleProvider";

interface LanguagesSectionProps {
  items: LanguageItem[];
}

export function LanguagesSection({ items }: LanguagesSectionProps) {
  const { t } = useLocale();

  const proficiencyLabel = (key: string) => {
    const translated = t(`profile.proficiency.${key}`);
    return translated !== `profile.proficiency.${key}` ? translated : key;
  };

  return (
    <ul className="space-y-3">
      {items.map((lang) => (
        <li
          key={lang.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
        >
          <span className="font-medium text-[#0F172A]">{lang.language}</span>
          <span className="text-sm text-slate-500">
            {proficiencyLabel(lang.proficiency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
