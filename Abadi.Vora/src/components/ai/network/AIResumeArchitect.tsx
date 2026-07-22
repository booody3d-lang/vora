"use client";

import { useState } from "react";
import type { FullProfessionalProfile } from "@/types/network";
import type { ResumeArchitectResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useTranslations } from "@/i18n/use-translations";

export function AIResumeArchitect({ profile }: { profile: FullProfessionalProfile }) {
  const { t, locale } = useTranslations();
  const { invoke, loading, error, source } = useAI<ResumeArchitectResult>();
  const [result, setResult] = useState<ResumeArchitectResult | null>(null);

  async function generate() {
    const data = await invoke("resume-architect", {
      profile: { fullName: profile.fullName, headline: profile.headline, about: profile.about ?? "" },
      locale,
    });
    if (data) setResult(data);
  }

  function printResume() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(result.pdfReadyHtml);
      w.document.close();
      w.print();
    }
  }

  return (
    <AIPanelShell
      titleKey="ai.resumeArchitect.title"
      descriptionKey="ai.resumeArchitect.description"
      badgeKey="ai.ats.badge"
      isPremium={profile.isPremium}
    >
      {profile.isPremium && (
        <>
          <button type="button" onClick={generate} disabled={loading} className="ai-btn">
            {t("ai.resumeArchitect.generate")}
          </button>
          {loading && <AILoadingSpinner />}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-4 space-y-3">
              <AISourceBadge source={source} />
              {result.sections.map((s) => (
                <div key={s.heading} className="rounded-xl border border-slate-200 p-3">
                  <h4 className="text-sm font-bold text-[#3B5998]">{s.heading}</h4>
                  <p className="mt-1 text-sm text-slate-600">{s.content}</p>
                </div>
              ))}
              <button type="button" onClick={printResume} className="w-full rounded-xl border border-[#3B5998] py-2 text-sm font-semibold text-[#3B5998]">
                {t("ai.resumeArchitect.downloadPrint")}
              </button>
            </div>
          )}
        </>
      )}
    </AIPanelShell>
  );
}
