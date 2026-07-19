"use client";

import { useLocale } from "@/providers/LocaleProvider";

interface AboutSectionProps {
  about: string;
}

export function AboutSection({ about }: AboutSectionProps) {
  const { t } = useLocale();

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        {t("profile.sections.about")}
      </h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{about}</p>
    </div>
  );
}
