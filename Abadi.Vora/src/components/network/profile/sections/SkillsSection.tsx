"use client";

import type { SkillItem } from "@/types/network";
import { useLocale } from "@/providers/LocaleProvider";

interface SkillsSectionProps {
  items: SkillItem[];
}

export function SkillsSection({ items }: SkillsSectionProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((skill) => (
        <div
          key={skill.id}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2"
        >
          <span className="text-sm font-medium text-[#0F172A]">{skill.name}</span>
          {skill.videoVerified && (
            <span
              title={t("profile.sections.videoVerifiedSkill")}
              className="flex items-center gap-0.5 rounded-full bg-[#3B5998]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3B5998]"
            >
              🎬 {t("profile.sections.verified")}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {t("profile.sections.endorsements").replace(
              "{count}",
              String(skill.endorsementCount)
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
