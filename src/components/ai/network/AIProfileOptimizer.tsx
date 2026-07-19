"use client";

import { useState } from "react";
import type { FullProfessionalProfile } from "@/types/network";
import type { ProfileOptimizeResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useTranslations } from "@/i18n/use-translations";

interface AIProfileOptimizerProps {
  profile: FullProfessionalProfile;
}

export function AIProfileOptimizer({ profile }: AIProfileOptimizerProps) {
  const { t, locale } = useTranslations();
  const { invoke, loading, error, source } = useAI<ProfileOptimizeResult>();
  const [result, setResult] = useState<ProfileOptimizeResult | null>(null);

  async function analyze() {
    const data = await invoke("profile-optimize", {
      headline: profile.headline,
      about: profile.about ?? "",
      experiences: profile.experiences.map((e) => ({ title: e.title, description: e.description })),
      locale,
    });
    if (data) setResult(data);
  }

  return (
    <AIPanelShell
      titleKey="ai.profileOptimizer.title"
      descriptionKey="ai.profileOptimizer.description"
      badgeKey="ai.ats.badge"
      isPremium={profile.isPremium}
    >
      {profile.isPremium && (
        <>
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("ai.profileOptimizer.analyzing") : t("ai.profileOptimizer.analyzeButton")}
          </button>
          {loading && <AILoadingSpinner />}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-4 space-y-4">
              <AISourceBadge source={source} />
              <div className="flex gap-4">
                <ScoreRing label={t("ai.profileOptimizer.scoreCurrent")} score={result.scoreBefore} />
                <span className="self-center text-2xl text-violet-400">→</span>
                <ScoreRing label={t("ai.profileOptimizer.scoreEstimated")} score={result.scoreAfterEstimate} highlight />
              </div>
              <ul className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-sm">
                    <p className="font-medium text-violet-800">{s.field}</p>
                    <p className="mt-1 text-slate-600">{s.reason}</p>
                    <p className="mt-2 rounded-lg bg-white p-2 text-emerald-700">{s.suggested}</p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AIPanelShell>
  );
}

function ScoreRing({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${
          highlight ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400" : "bg-slate-100 text-slate-600"
        }`}
      >
        {score}%
      </div>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
