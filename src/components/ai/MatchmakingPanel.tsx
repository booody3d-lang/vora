"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { MatchmakingResult } from "@/types/ai";
import { AILoadingSpinner, useAI } from "@/components/ai/AIPanelShell";
import { useLocale } from "@/providers/LocaleProvider";
import { DEMO_CURRENT_USER } from "@/lib/network/mock-data";
import { formatSar } from "@/lib/billing/engine";

export function MatchmakingPanel() {
  const { locale } = useLocale();
  const { invoke, loading, source } = useAI<MatchmakingResult>();
  const [result, setResult] = useState<MatchmakingResult | null>(null);

  useEffect(() => {
    invoke("matchmaking", {
      userProfile: {
        headline: DEMO_CURRENT_USER.headline,
        skills: DEMO_CURRENT_USER.skills.map((s) => s.name),
        about: DEMO_CURRENT_USER.about,
      },
      locale,
    }).then((data) => {
      if (data) setResult(data);
    });
  }, [invoke, locale]);

  const isAr = locale === "ar";

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm">
      <div className="border-b border-violet-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span>🧠</span>
          <h2 className="text-sm font-bold text-[#0F172A]">
            {isAr ? "VORA AI — توصيات ذكية" : "VORA AI — Smart Matchmaking"}
          </h2>
        </div>
        <p className="text-[10px] text-slate-400">
          {isAr ? "بحث دلالي بالمتجهات — ليس مجرد كلمات مفتاحية" : "Vector semantic engine — beyond keyword matching"}
        </p>
        {source && (
          <span className="text-[10px] text-violet-500">{source === "openai" ? "● Live AI" : "○ Demo"}</span>
        )}
      </div>
      {loading && <div className="p-4"><AILoadingSpinner /></div>}
      {result && (
        <div className="divide-y divide-violet-50">
          <Section title={isAr ? "وظائف موصى بها" : "Recommended Jobs"}>
            {result.recommendedJobs.map((job) => (
              <Link key={job.id} href="/network/jobs" className="block px-4 py-3 hover:bg-violet-50/50">
                <div className="flex justify-between">
                  <p className="text-sm font-semibold text-[#0F172A]">{job.title}</p>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    {job.matchScore}%
                  </span>
                </div>
                <p className="text-xs text-[#3B5998]">{job.company}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{job.reason}</p>
              </Link>
            ))}
          </Section>
          <Section title={isAr ? "خدمات موصى بها" : "Recommended Services"}>
            {result.recommendedServices.map((svc) => (
              <Link key={svc.id} href="/freelance" className="block px-4 py-3 hover:bg-violet-50/50">
                <div className="flex justify-between">
                  <p className="text-sm font-semibold text-[#0F172A]">{svc.title}</p>
                  <span className="text-xs font-semibold text-[#EA580C]">{formatSar(svc.priceSar)}</span>
                </div>
                <p className="text-xs text-slate-500">{svc.storeName} · {svc.matchScore}% match</p>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="bg-violet-50/80 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">{title}</p>
      {children}
    </div>
  );
}
