"use client";

import { useState } from "react";
import type { SkillsPredictResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useLocale } from "@/providers/LocaleProvider";

export function MissingSkillsPredictor({ isPremium }: { isPremium: boolean }) {
  const { locale } = useLocale();
  const { invoke, loading, error, source } = useAI<SkillsPredictResult>();
  const [result, setResult] = useState<SkillsPredictResult | null>(null);

  async function predict() {
    const data = await invoke("skills-predict", { locale });
    if (data) setResult(data);
  }

  return (
    <AIPanelShell
      title="Missing Skills Predictor"
      titleAr="توقع المهارات الناقصة"
      description="Compare your profile with trending Saudi & global vacancies"
      descriptionAr="قارن ملفك مع الوظائف الرائجة في السعودية والعالم"
      locale={locale}
      isPremium={isPremium}
      badge="Network AI"
    >
      {isPremium && (
        <>
          <button type="button" onClick={predict} disabled={loading} className="ai-btn">
            {locale === "ar" ? "توقع المهارات" : "Predict Missing Skills"}
          </button>
          {loading && <AILoadingSpinner />}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-4 space-y-4">
              <AISourceBadge source={source} />
              <Section title={locale === "ar" ? "مهارات مطلوبة" : "Trending Skills"}>
                {result.trendingSkills.map((s) => (
                  <div key={s.name} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>{s.name}</span>
                    <span className={s.demand === "high" ? "text-red-600" : "text-amber-600"}>{s.demand} · {s.region}</span>
                  </div>
                ))}
              </Section>
              <Section title={locale === "ar" ? "مهارات ناقصة" : "Missing Skills"}>
                {result.missingSkills.map((s) => (
                  <div key={s.name} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-amber-700">{s.impact}</p>
                  </div>
                ))}
              </Section>
            </div>
          )}
        </>
      )}
    </AIPanelShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[#0F172A]">{title}</h4>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}
