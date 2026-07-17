"use client";

import Link from "next/link";
import { AIProfileOptimizer } from "@/components/ai/network/AIProfileOptimizer";
import { MissingSkillsPredictor } from "@/components/ai/network/MissingSkillsPredictor";
import { AIResumeArchitect } from "@/components/ai/network/AIResumeArchitect";
import { ATSScanner } from "@/components/ai/network/ATSScanner";
import { MatchmakingPanel } from "@/components/ai/MatchmakingPanel";
import { DEMO_CURRENT_USER } from "@/lib/network/mock-data";

export default function NetworkAIPage() {
  const profile = DEMO_CURRENT_USER;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6">
        <Link href="/network" className="text-sm text-[#3B5998] hover:underline">
          ← Back to Network
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0F172A]">
          VORA AI <span className="text-violet-600">Ecosystem</span>
        </h1>
        <p className="text-sm text-slate-500">
          Bilingual AI assistant · Profile optimization · Resume & ATS · Semantic matchmaking
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AIProfileOptimizer profile={profile} />
          <MissingSkillsPredictor isPremium={profile.isPremium} />
          <AIResumeArchitect profile={profile} />
          <ATSScanner isPremium={profile.isPremium} />
        </div>
        <div>
          <MatchmakingPanel />
        </div>
      </div>
    </div>
  );
}
