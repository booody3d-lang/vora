"use client";

import Link from "next/link";
import type { ExperienceItem } from "@/types/network";
import { getCompanyUrl } from "@/lib/network/urls";
import { useLocale } from "@/providers/LocaleProvider";

interface ExperienceSectionProps {
  items: ExperienceItem[];
}

export function ExperienceSection({ items }: ExperienceSectionProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      {items.map((exp) => (
        <div key={exp.id} className="flex gap-4">
          {exp.companyLogoUrl ? (
            <img
              src={exp.companyLogoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
              🏢
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-[#0F172A]">{exp.title}</h4>
            {exp.companySlug ? (
              <Link
                href={getCompanyUrl(exp.companySlug)}
                className="text-sm text-[#3B5998] hover:underline"
              >
                {exp.companyName}
              </Link>
            ) : (
              <p className="text-sm text-slate-600">{exp.companyName}</p>
            )}
            <p className="text-xs text-slate-400">
              {exp.startDate} — {exp.isCurrent ? t("profile.sections.present") : exp.endDate}
              {exp.location && ` · ${exp.location}`}
            </p>
            {exp.isVerified && (
              <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-600">
                ✓ {t("profile.sections.verified")}
              </span>
            )}
            {exp.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{exp.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
