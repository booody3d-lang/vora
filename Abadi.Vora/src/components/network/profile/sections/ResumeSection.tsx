"use client";

import { useLocale } from "@/providers/LocaleProvider";

interface ResumeSectionProps {
  resumeUrl?: string;
}

export function ResumeSection({ resumeUrl }: ResumeSectionProps) {
  const { t } = useLocale();

  if (!resumeUrl) {
    return <p className="text-sm text-slate-400">{t("profile.sections.noResume")}</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl">
        📄
      </div>
      <p className="mt-3 font-medium text-[#0F172A]">{t("profile.sections.resumeTitle")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("profile.sections.resumeHint")}</p>
      <div className="mt-4 flex justify-center gap-3">
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("profile.sections.viewPdf")}
        </a>
        <a
          href={resumeUrl}
          download
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          {t("profile.sections.download")}
        </a>
      </div>
    </div>
  );
}
