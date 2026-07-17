import type { LanguageItem } from "@/types/network";

const PROFICIENCY_LABELS: Record<string, string> = {
  elementary: "Elementary",
  limited: "Limited Working",
  professional: "Professional Working",
  full: "Full Professional",
  native: "Native / Bilingual",
};

interface LanguagesSectionProps {
  items: LanguageItem[];
}

export function LanguagesSection({ items }: LanguagesSectionProps) {
  return (
    <ul className="space-y-3">
      {items.map((lang) => (
        <li key={lang.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <span className="font-medium text-[#0F172A]">{lang.language}</span>
          <span className="text-sm text-slate-500">
            {PROFICIENCY_LABELS[lang.proficiency] ?? lang.proficiency}
          </span>
        </li>
      ))}
    </ul>
  );
}
