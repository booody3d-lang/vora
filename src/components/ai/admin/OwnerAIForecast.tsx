"use client";

import { useState, useEffect } from "react";
import type { OwnerForecastResult } from "@/types/ai";
import { AILoadingSpinner, useAI } from "@/components/ai/AIPanelShell";
import { formatSar } from "@/lib/billing/engine";

export function OwnerAIForecast() {
  const { invoke, loading, source } = useAI<OwnerForecastResult>();
  const [result, setResult] = useState<OwnerForecastResult | null>(null);

  useEffect(() => {
    invoke("owner-forecast", {}).then((data) => {
      if (data) setResult(data);
    });
  }, [invoke]);

  if (loading) return <AILoadingSpinner />;
  if (!result) return null;

  const maxRev = Math.max(...result.quarterlyProjections.map((q) => q.revenueSar));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Predictive Owner AI</h2>
          <p className="text-xs text-slate-400">Revenue forecasting · Churn · Anomaly detection</p>
        </div>
        <span className="text-[10px] text-slate-500">{source === "openai" ? "Live AI" : "Demo Mode"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <p className="text-xs text-slate-400">Predicted Churn Rate</p>
          <p className="text-3xl font-bold text-violet-400">{result.churnRatePercent}%</p>
          <p className="mt-2 text-xs text-slate-500">{result.churnPrediction}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs text-slate-400">Q2 2027 Forecast</p>
          <p className="text-3xl font-bold text-emerald-400">
            {formatSar(result.quarterlyProjections[3]?.revenueSar ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
        <h3 className="text-sm font-semibold text-white">Quarterly Revenue Projections (SR)</h3>
        <div className="mt-4 flex h-32 items-end gap-3">
          {result.quarterlyProjections.map((q) => (
            <div key={q.quarter} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-emerald-400">+{q.growthPercent}%</span>
              <div
                className="w-full rounded-t bg-gradient-to-t from-violet-600 to-indigo-500"
                style={{ height: `${(q.revenueSar / maxRev) * 100}%`, minHeight: 8 }}
              />
              <span className="text-[9px] text-slate-500">{q.quarter}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold text-amber-400">⚠ Anomalies</h3>
          <ul className="mt-3 space-y-2">
            {result.anomalies.map((a, i) => (
              <li key={i} className="rounded-lg bg-slate-900 px-3 py-2 text-sm">
                <span className={`text-[10px] font-bold uppercase ${a.severity === "high" ? "text-red-400" : "text-amber-400"}`}>
                  {a.severity}
                </span>
                <p className="text-slate-300">{a.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
          <h3 className="text-sm font-semibold text-emerald-400">📈 Emerging Trends</h3>
          <ul className="mt-3 space-y-2">
            {result.emergingTrends.map((t, i) => (
              <li key={i} className="rounded-lg bg-slate-900 px-3 py-2 text-sm">
                <p className="font-medium text-white">{t.category} <span className="text-emerald-400">+{t.growthPercent}%</span></p>
                <p className="text-xs text-slate-500">{t.insight}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
