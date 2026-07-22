import { chatJSON, getEmbedding, isAIConfigured } from "@/lib/ai/client";
import {
  demoATSScan,
  demoCandidateRank,
  demoMatchmaking,
  demoOwnerForecast,
  demoPricingRecommend,
  demoProfileOptimize,
  demoResumeArchitect,
  demoServiceOptimize,
  demoSkillsPredict,
} from "@/lib/ai/demo";
import { demoEmbed, getDemoVectorStore } from "@/lib/ai/embeddings";
import type {
  ATSScanInput,
  ATSScanResult,
  CandidateRankInput,
  CandidateRankResult,
  MatchmakingInput,
  MatchmakingResult,
  OwnerForecastResult,
  PricingRecommendInput,
  PricingRecommendResult,
  ProfileOptimizeInput,
  ProfileOptimizeResult,
  ResumeArchitectResult,
  ServiceOptimizeInput,
  ServiceOptimizeResult,
  SkillsPredictResult,
} from "@/types/ai";

export async function runProfileOptimize(input: ProfileOptimizeInput): Promise<ProfileOptimizeResult> {
  const llm = await chatJSON<ProfileOptimizeResult>(
    "You are VORA AI Profile Optimizer. Analyze professional profiles for GCC/Saudi market. Return JSON with scoreBefore, scoreAfterEstimate, suggestions[], keywords[], toneTips[].",
    JSON.stringify(input),
    input.locale
  );
  return llm?.data ?? demoProfileOptimize(input);
}

export async function runSkillsPredict(locale: "en" | "ar"): Promise<SkillsPredictResult> {
  const llm = await chatJSON<SkillsPredictResult>(
    "You are VORA AI Skills Predictor. Suggest trending and missing skills for Saudi/GCC job market.",
    "Analyze profile gaps for a product designer in Saudi Arabia",
    locale
  );
  return llm?.data ?? demoSkillsPredict();
}

export async function runResumeArchitect(
  profile: { fullName: string; headline: string; about: string },
  locale: "en" | "ar"
): Promise<ResumeArchitectResult> {
  const llm = await chatJSON<ResumeArchitectResult>(
    "You are VORA AI Resume Architect. Generate ATS-friendly resume sections from profile data.",
    JSON.stringify(profile),
    locale
  );
  return llm?.data ?? demoResumeArchitect(profile.fullName, locale);
}

export async function runATSScan(input: ATSScanInput): Promise<ATSScanResult> {
  const llm = await chatJSON<ATSScanResult>(
    "You are VORA ATS Scanner. Compare resume to job posting. Return matchScore 0-100, keywordGaps, matchedKeywords, formattingIssues, recommendations.",
    JSON.stringify(input),
    input.locale
  );
  return llm?.data ?? demoATSScan(input);
}

export async function runCandidateRank(input: CandidateRankInput): Promise<CandidateRankResult> {
  const llm = await chatJSON<CandidateRankResult>(
    "You are VORA Recruitment AI. Rank candidates 0-100. autoShortlisted=true if matchScore>=85.",
    JSON.stringify(input),
    "en"
  );
  const result = llm?.data ?? demoCandidateRank(input);
  result.rankings = result.rankings.map((r) => ({
    ...r,
    autoShortlisted: r.matchScore >= 85,
  }));
  return result;
}

export async function runServiceOptimize(input: ServiceOptimizeInput): Promise<ServiceOptimizeResult> {
  const llm = await chatJSON<ServiceOptimizeResult>(
    "You are VORA Freelance SEO AI. Optimize service titles and tags in both English and Arabic.",
    JSON.stringify(input),
    input.locale
  );
  return llm?.data ?? demoServiceOptimize(input);
}

export async function runPricingRecommend(input: PricingRecommendInput): Promise<PricingRecommendResult> {
  const llm = await chatJSON<PricingRecommendResult>(
    "You are VORA Pricing AI. Recommend competitive SAR pricing for Saudi freelance marketplace.",
    JSON.stringify(input),
    "en"
  );
  return llm?.data ?? demoPricingRecommend(input);
}

export async function runOwnerForecast(): Promise<OwnerForecastResult> {
  const llm = await chatJSON<OwnerForecastResult>(
    "You are VORA Owner Predictive AI. Forecast platform revenue in SAR, churn, anomalies, trends.",
    "Historical: SR 2.8M gross, SR 487K subscriptions, SR 198K commissions, 24847 users",
    "en"
  );
  return llm?.data ?? demoOwnerForecast();
}

export async function runMatchmaking(input: MatchmakingInput): Promise<MatchmakingResult> {
  const queryText = `${input.userProfile.headline} ${input.userProfile.skills.join(" ")} ${input.userProfile.about ?? ""}`;
  const store = getDemoVectorStore();

  let queryEmbedding: number[];
  if (isAIConfigured()) {
    queryEmbedding = (await getEmbedding(queryText)) ?? demoEmbed(queryText);
  } else {
    queryEmbedding = demoEmbed(queryText);
  }

  const results = store.search(queryEmbedding, 6);
  const isAr = input.locale === "ar";

  const jobs = results
    .filter((r) => r.doc.metadata.type === "job")
    .map((r) => ({
      id: r.doc.id,
      title: String(r.doc.metadata.title),
      company: String(r.doc.metadata.company),
      matchScore: Math.round(r.score * 100),
      reason: isAr
        ? `تطابق دلالي ${Math.round(r.score * 100)}% عبر محرك VORA AI`
        : `${Math.round(r.score * 100)}% semantic match via VORA AI engine`,
    }));

  const services = results
    .filter((r) => r.doc.metadata.type === "service")
    .map((r) => ({
      id: r.doc.id,
      title: String(r.doc.metadata.title),
      storeName: String(r.doc.metadata.store),
      priceSar: Number(r.doc.metadata.price),
      matchScore: Math.round(r.score * 100),
      reason: isAr ? "موصى به بناءً على ملفك المهني" : "Recommended based on your professional profile",
    }));

  if (jobs.length === 0 && services.length === 0) {
    return demoMatchmaking(input);
  }

  return { recommendedJobs: jobs, recommendedServices: services };
}

export { isAIConfigured };
