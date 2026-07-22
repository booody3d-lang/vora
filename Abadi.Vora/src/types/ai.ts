export type AILocale = "en" | "ar";
export type AIAction =
  | "profile-optimize"
  | "skills-predict"
  | "resume-architect"
  | "ats-scan"
  | "candidate-rank"
  | "service-optimize"
  | "pricing-recommend"
  | "owner-forecast"
  | "matchmaking";

export interface ProfileOptimizeInput {
  headline: string;
  about: string;
  experiences: { title: string; description?: string }[];
  locale: AILocale;
}

export interface ProfileOptimizeResult {
  scoreBefore: number;
  scoreAfterEstimate: number;
  suggestions: { field: string; current: string; suggested: string; reason: string }[];
  keywords: string[];
  toneTips: string[];
}

export interface SkillsPredictResult {
  trendingSkills: { name: string; demand: "high" | "medium"; region: string }[];
  missingSkills: { name: string; impact: string; credentialSuggestion?: string }[];
  saudiMarketInsights: string[];
}

export interface ResumeArchitectResult {
  sections: { heading: string; content: string }[];
  pdfReadyHtml: string;
  atsTips: string[];
}

export interface ATSScanInput {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  locale: AILocale;
}

export interface ATSScanResult {
  matchScore: number;
  keywordGaps: string[];
  matchedKeywords: string[];
  formattingIssues: string[];
  recommendations: string[];
}

export interface CandidateRankInput {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  candidates: {
    id: string;
    fullName: string;
    headline: string;
    professionalScore: number;
    skills?: string[];
  }[];
}

export interface CandidateRankResult {
  rankings: {
    id: string;
    matchScore: number;
    autoShortlisted: boolean;
    strengths: string[];
    gaps: string[];
  }[];
}

export interface ServiceOptimizeInput {
  title: string;
  description: string;
  category: string;
  deliveryDays: number;
  locale: AILocale;
}

export interface ServiceOptimizeResult {
  improvedTitle: { en: string; ar: string };
  seoTags: { en: string[]; ar: string[] };
  descriptionTips: string[];
  titleScore: number;
}

export interface PricingRecommendInput {
  title: string;
  category: string;
  deliveryDays: number;
  scope: string;
}

export interface PricingRecommendResult {
  recommendedPriceSar: number;
  priceRange: { min: number; max: number };
  marketComparison: string;
  tiers: { label: string; priceSar: number; description: string }[];
}

export interface OwnerForecastResult {
  quarterlyProjections: { quarter: string; revenueSar: number; growthPercent: number }[];
  churnRatePercent: number;
  churnPrediction: string;
  anomalies: { type: string; description: string; severity: "low" | "medium" | "high" }[];
  emergingTrends: { category: string; growthPercent: number; insight: string }[];
}

export interface MatchmakingInput {
  userProfile: {
    headline: string;
    skills: string[];
    about?: string;
  };
  locale: AILocale;
}

export interface MatchmakingResult {
  recommendedJobs: {
    id: string;
    title: string;
    company: string;
    matchScore: number;
    reason: string;
  }[];
  recommendedServices: {
    id: string;
    title: string;
    storeName: string;
    priceSar: number;
    matchScore: number;
    reason: string;
  }[];
}

export interface AIResponseMeta {
  source: "openai" | "demo";
  model?: string;
  locale: AILocale;
}
