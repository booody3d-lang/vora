"use client";



import { useState, useEffect } from "react";

import type { ApplicantCard } from "@/types/company";

import type { CandidateRankResult } from "@/types/ai";

import { AILoadingSpinner, useAI } from "@/components/ai/AIPanelShell";

import { useTranslations } from "@/i18n/use-translations";



interface CandidateRankingPanelProps {

  jobTitle: string;

  jobDescription: string;

  requiredSkills: string[];

  applicants: ApplicantCard[];

  onRankings?: (rankings: CandidateRankResult["rankings"]) => void;

}



export function CandidateRankingPanel({

  jobTitle,

  jobDescription,

  requiredSkills,

  applicants,

  onRankings,

}: CandidateRankingPanelProps) {

  const { t } = useTranslations();

  const { invoke, loading, source } = useAI<CandidateRankResult>();

  const [rankings, setRankings] = useState<CandidateRankResult["rankings"]>([]);



  useEffect(() => {

    let cancelled = false;

    async function rank() {

      const data = await invoke("candidate-rank", {

        jobTitle,

        jobDescription,

        requiredSkills,

        candidates: applicants.map((a) => ({

          id: a.id,

          fullName: a.fullName,

          headline: a.headline,

          professionalScore: a.professionalScore,

        })),

      });

      if (data && !cancelled) {

        setRankings(data.rankings);

        onRankings?.(data.rankings);

      }

    }

    rank();

    return () => { cancelled = true; };

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [jobTitle]);



  const shortlisted = rankings.filter((r) => r.autoShortlisted);



  return (

    <div className="rounded-2xl border border-[#3B5998]/20 bg-gradient-to-br from-[#3B5998]/5 to-indigo-50 p-5">

      <div className="flex items-center gap-2">

        <span className="text-lg">🤖</span>

        <h3 className="font-bold text-[#0F172A]">{t("ai.candidateRank.title")}</h3>

        {source && (

          <span className="text-[10px] text-slate-400">

            {source === "openai" ? t("ai.common.liveAi") : t("ai.common.demoShort")}

          </span>

        )}

      </div>

      <p className="mt-1 text-xs text-slate-500">{t("ai.candidateRank.subtitle")}</p>

      {loading && <AILoadingSpinner />}

      {shortlisted.length > 0 && (

        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">

          <p className="text-sm font-semibold text-emerald-800">

            {t("ai.candidateRank.autoFlagged", { count: shortlisted.length })}

          </p>

        </div>

      )}

      <div className="mt-3 space-y-2">

        {rankings

          .sort((a, b) => b.matchScore - a.matchScore)

          .map((r) => {

            const applicant = applicants.find((a) => a.id === r.id);

            if (!applicant) return null;

            return (

              <div key={r.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">

                <div>

                  <p className="font-medium">{applicant.fullName}</p>

                  {r.autoShortlisted && (

                    <span className="text-[10px] font-bold text-emerald-600">{t("ai.candidateRank.autoShortlisted")}</span>

                  )}

                </div>

                <span className={`font-bold ${r.matchScore >= 85 ? "text-emerald-600" : "text-slate-600"}`}>

                  {r.matchScore}%

                </span>

              </div>

            );

          })}

      </div>

    </div>

  );

}


