"use client";

import { useState } from "react";
import type { FullProfessionalProfile } from "@/types/network";
import type { ResumeArchitectResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useLocale } from "@/providers/LocaleProvider";

export function AIResumeArchitect({ profile }: { profile: FullProfessionalProfile }) {
  const { locale } = useLocale();
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
      title="AI Resume Architect"
      titleAr="مهندس السيرة الذاتية"
      description="Generate ATS-friendly PDF resumes from your VORA profile"
      descriptionAr="إنشاء سيرة ذاتية PDF متوافقة مع ATS من ملف VORA"
      locale={locale}
      isPremium={profile.isPremium}
      badge="Network AI"
    >
      {profile.isPremium && (
        <>
          <button type="button" onClick={generate} disabled={loading} className="ai-btn">
            {locale === "ar" ? "إنشاء السيرة" : "Generate Resume"}
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
                {locale === "ar" ? "تحميل PDF / طباعة" : "Download PDF / Print"}
              </button>
            </div>
          )}
        </>
      )}
    </AIPanelShell>
  );
}
