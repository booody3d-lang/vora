"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useTranslations } from "@/i18n/use-translations";

export function useAI<T>() {
  const { t } = useTranslations();
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
      if (!res.ok) throw new Error(json.error ?? t("ai.errors.requestFailed"));
      setSource(json.meta?.source ?? "demo");
      return json.data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ai.errors.unknown"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { invoke, loading, error, source };
}

export function AIPanelShell({
  titleKey,
  descriptionKey,
  isPremium,
  children,
  badgeKey,
}: {
  titleKey: string;
  descriptionKey: string;
  isPremium?: boolean;
  badgeKey?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslations();
  const title = t(titleKey);
  const description = t(descriptionKey);
  const badge = badgeKey ? t(badgeKey) : undefined;

  if (isPremium === false) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="font-bold text-[#0F172A]">{title}</h3>
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {t("ai.common.premiumBadge")}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <Link
          href="/billing/plans"
          className="mt-4 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("ai.common.upgradeCta")}
        </Link>
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
            <h3 className="font-bold text-[#0F172A]">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
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
  const { t } = useTranslations();
  if (!source) return null;
  return (
    <span className={`text-[10px] ${source === "openai" ? "text-emerald-600" : "text-slate-400"}`}>
      {source === "openai" ? t("ai.common.liveAi") : t("ai.common.demoMode")}
    </span>
  );
}

export function AILoadingSpinner() {
  const { t } = useTranslations();
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-violet-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      {t("ai.common.analyzing")}
    </div>
  );
}
