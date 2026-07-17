"use client";

import { useState, useCallback } from "react";
import type { AILocale } from "@/types/ai";

export function useAI<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"openai" | "demo" | null>(null);

  const invoke = useCallback(async (action: string, payload: Record<string, unknown>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI request failed");
      setSource(json.meta?.source ?? "demo");
      return json.data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error, source };
}

export function AIPanelShell({
  title,
  titleAr,
  description,
  descriptionAr,
  locale,
  isPremium,
  children,
  badge,
}: {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  locale: AILocale;
  isPremium?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const isAr = locale === "ar";

  if (isPremium === false) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="font-bold text-[#0F172A]">{isAr ? titleAr : title}</h3>
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">PREMIUM</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{isAr ? descriptionAr : description}</p>
        <a
          href="/billing/plans"
          className="mt-4 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {isAr ? "ترقية إلى Premium لتفعيل VORA AI" : "Upgrade to Premium to unlock VORA AI"}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm text-white">
            ✨
          </span>
          <div>
            <h3 className="font-bold text-[#0F172A]">{isAr ? titleAr : title}</h3>
            <p className="text-xs text-slate-500">{isAr ? descriptionAr : description}</p>
          </div>
        </div>
        {badge && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function AISourceBadge({ source }: { source: "openai" | "demo" | null }) {
  if (!source) return null;
  return (
    <span className={`text-[10px] ${source === "openai" ? "text-emerald-600" : "text-slate-400"}`}>
      {source === "openai" ? "● Live AI" : "○ Demo Mode"}
    </span>
  );
}

export function AILoadingSpinner() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-violet-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      VORA AI is analyzing...
    </div>
  );
}
