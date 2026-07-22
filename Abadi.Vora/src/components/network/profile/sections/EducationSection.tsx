"use client";

import type { EducationItem } from "@/types/network";
import { useLocale } from "@/providers/LocaleProvider";

interface EducationSectionProps {
  items: EducationItem[];
}

export function EducationSection({ items }: EducationSectionProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      {items.map((edu) => (
        <div key={edu.id} className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            🎓
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A]">{edu.institution}</h4>
            <p className="text-sm text-slate-600">
              {edu.degree}
              {edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
            </p>
            {edu.endDate && (
              <p className="text-xs text-slate-400">
                {t("profile.sections.graduated")} {edu.endDate}
              </p>
            )}
            {edu.isVerified && (
              <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-600">
                ✓ {t("profile.sections.verified")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
