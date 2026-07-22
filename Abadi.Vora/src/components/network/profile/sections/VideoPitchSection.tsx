"use client";

import { useLocale } from "@/providers/LocaleProvider";

interface VideoPitchSectionProps {
  videoUrl?: string;
}

export function VideoPitchSection({ videoUrl }: VideoPitchSectionProps) {
  const { t } = useLocale();

  if (!videoUrl) {
    return <p className="text-sm text-slate-400">{t("profile.sections.noVideo")}</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        {t("profile.sections.videoPitch")}{" "}
        <span className="font-normal normal-case">{t("profile.sections.videoMax")}</span>
      </h3>
      <div className="mt-3 overflow-hidden rounded-xl bg-black">
        <video src={videoUrl} controls className="w-full" style={{ maxHeight: 400 }}>
          {t("profile.sections.noVideoSupport")}
        </video>
      </div>
    </div>
  );
}
