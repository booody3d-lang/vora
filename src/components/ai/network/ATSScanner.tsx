"use client";

import { useState } from "react";
import type { ATSScanResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useLocale } from "@/providers/LocaleProvider";

export function ATSScanner({ isPremium }: { isPremium: boolean }) {
  const { locale } = useLocale();
  const { invoke, loading, error, source } = useAI<ATSScanResult>();
  const [result, setResult] = useState<ATSScanResult | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  async function scan() {
    const data = await invoke("ats-scan", {
      resumeText,
      jobTitle,
      jobDescription,
      requiredSkills: jobDescription.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
      locale,
    });
    if (data) setResult(data);
  }

  return (
    <AIPanelShell
      title="ATS Compatibility Scanner"
      titleAr="فحص توافق ATS"
      description="Upload resume + target job for precise 0–100% match score"
      descriptionAr="ارفع السيرة + الوظيفة المستهدفة للحصول على نسبة تطابق دقيقة"
      locale={locale}
      isPremium={isPremium}
      badge="Network AI"
    >
      {isPremium && (
        <>
          <div className="space-y-3">
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={locale === "ar" ? "عنوان الوظيفة" : "Target Job Title"} className="ai-input" />
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder={locale === "ar" ? "وصف الوظيفة والمهارات" : "Job description & skills"} rows={3} className="ai-input" />
            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder={locale === "ar" ? "نص السيرة الذاتية" : "Paste resume text"} rows={4} className="ai-input" />
          </div>
          <button type="button" onClick={scan} disabled={loading || !resumeText || !jobTitle} className="ai-btn mt-3">
            {locale === "ar" ? "فحص ATS" : "Run ATS Scan"}
          </button>
          {loading && <AILoadingSpinner />}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-4 space-y-3">
              <AISourceBadge source={source} />
              <div className="text-center">
                <p className="text-4xl font-bold text-[#3B5998]">{result.matchScore}%</p>
                <p className="text-sm text-slate-500">{locale === "ar" ? "نسبة التطابق" : "Match Score"}</p>
              </div>
              <TagList title={locale === "ar" ? "كلمات متطابقة" : "Matched"} items={result.matchedKeywords} color="emerald" />
              <TagList title={locale === "ar" ? "فجوات" : "Gaps"} items={result.keywordGaps} color="red" />
              <ul className="text-sm text-slate-600">
                {result.recommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AIPanelShell>
  );
}

function TagList({ title, items, color }: { title: string; items: string[]; color: "emerald" | "red" }) {
  const cls = color === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
