"use client";



import { useState, useEffect } from "react";

import Link from "next/link";

import type { MatchmakingResult } from "@/types/ai";

import { AILoadingSpinner, useAI } from "@/components/ai/AIPanelShell";

import { useCurrentProfile } from "@/hooks/use-current-profile";

import { useLocale } from "@/providers/LocaleProvider";

import { useTranslations } from "@/i18n/use-translations";

import { formatSar } from "@/lib/billing/engine";



export function MatchmakingPanel() {

  const { locale } = useLocale();

  const { t } = useTranslations();

  const { profile, loading: profileLoading } = useCurrentProfile();

  const { invoke, loading, source } = useAI<MatchmakingResult>();

  const [result, setResult] = useState<MatchmakingResult | null>(null);



  useEffect(() => {

    if (profileLoading || !profile) return;



    invoke("matchmaking", {

      userProfile: {

        headline: profile.headline,

        skills: profile.skills.map((s) => s.name),

        about: profile.about,

      },

      locale,

    }).then((data) => {

      if (data) setResult(data);

    });

  }, [invoke, locale, profile, profileLoading]);



  if (!profileLoading && !profile) {

    return (

      <div className="overflow-hidden rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-center text-xs text-violet-700">

        {t("network.profileCard.emptyBody")}

      </div>

    );

  }



  return (

    <div className="overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm">

      <div className="border-b border-violet-100 px-4 py-3">

        <div className="flex items-center gap-2">

          <span>🧠</span>

          <h2 className="text-sm font-bold text-[#0F172A]">{t("ai.matchmaking.title")}</h2>

        </div>

        <p className="text-[10px] text-slate-400">{t("ai.matchmaking.subtitle")}</p>

        {source && (

          <span className="text-[10px] text-violet-500">

            {source === "openai" ? t("ai.common.liveAi") : t("ai.common.demoShort")}

          </span>

        )}

      </div>

      {loading && (

        <div className="p-4">

          <AILoadingSpinner />

        </div>

      )}

      {result && (

        <div className="divide-y divide-violet-50">

          <Section title={t("ai.matchmaking.recommendedJobs")}>

            {result.recommendedJobs.length === 0 ? (

              <p className="px-4 py-3 text-xs text-slate-400">{t("network.jobsEmptyBody")}</p>

            ) : (

              result.recommendedJobs.map((job) => (

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

              ))

            )}

          </Section>

          <Section title={t("ai.matchmaking.recommendedServices")}>

            {result.recommendedServices.length === 0 ? (

              <p className="px-4 py-3 text-xs text-slate-400">{t("common.comingSoon")}</p>

            ) : (

              result.recommendedServices.map((svc) => (

                <Link key={svc.id} href="/freelance" className="block px-4 py-3 hover:bg-violet-50/50">

                  <div className="flex justify-between">

                    <p className="text-sm font-semibold text-[#0F172A]">{svc.title}</p>

                    <span className="text-xs font-semibold text-[#EA580C]">{formatSar(svc.priceSar)}</span>

                  </div>

                  <p className="text-xs text-slate-500">

                    {svc.storeName} · {t("ai.matchmaking.matchPercent", { score: svc.matchScore })}

                  </p>

                </Link>

              ))

            )}

          </Section>

        </div>

      )}

    </div>

  );

}



function Section({ title, children }: { title: string; children: React.ReactNode }) {

  return (

    <div>

      <p className="bg-violet-50/80 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">

        {title}

      </p>

      {children}

    </div>

  );

}

