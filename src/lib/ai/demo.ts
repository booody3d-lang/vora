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

export function demoProfileOptimize(input: ProfileOptimizeInput): ProfileOptimizeResult {
  const isAr = input.locale === "ar";
  return {
    scoreBefore: 72,
    scoreAfterEstimate: 89,
    suggestions: [
      {
        field: isAr ? "العنوان" : "Headline",
        current: input.headline,
        suggested: isAr
          ? "مصمم منتجات أول | استراتيجية UX | أنظمة التصميم | SaaS"
          : "Senior Product Designer | UX Strategy & Design Systems | Enterprise SaaS",
        reason: isAr
          ? "أضف كلمات مفتاحية سعودية وخليجية مطلوبة في سوق التقنية"
          : "Add high-value keywords recruiters search for in GCC tech market",
      },
      {
        field: isAr ? "نبذة" : "About",
        current: input.about.slice(0, 80) + "...",
        suggested: isAr
          ? "ابدأ بإنجاز قابل للقياس (مثل: خفض وقت إنجاز المهام 34%) ثم اذكر التخصص"
          : "Lead with a quantified achievement, then state your niche and value proposition",
        reason: isAr ? "النبرة الاحترافية تزيد Professional Score" : "Quantified outcomes boost Professional Score",
      },
    ],
    keywords: isAr
      ? ["تصميم المنتجات", "تجربة المستخدم", "Figma", "أنظمة التصميم", "SaaS"]
      : ["Product Design", "UX Strategy", "Figma", "Design Systems", "Enterprise SaaS"],
    toneTips: isAr
      ? ["استخدم صيغة الفعل في بداية كل نقطة", "تجنب العبارات العامة مثل 'شغوف'"]
      : ["Use action verbs at bullet starts", "Avoid generic phrases like 'passionate team player'"],
  };
}

export function demoSkillsPredict(): SkillsPredictResult {
  return {
    trendingSkills: [
      { name: "AI Product Design", demand: "high", region: "Saudi Arabia" },
      { name: "Design Tokens & Figma Variables", demand: "high", region: "GCC" },
      { name: "Arabic UX Localization", demand: "medium", region: "MENA" },
    ],
    missingSkills: [
      { name: "Accessibility (WCAG 2.2)", impact: "+8% profile visibility", credentialSuggestion: "IAAP CPACC" },
      { name: "Design System Governance", impact: "+5% recruiter match rate" },
      { name: "React/Design Handoff", impact: "Required by 34% of Riyadh UX roles" },
    ],
    saudiMarketInsights: [
      "NEOM and PIF-backed tech roles prioritize bilingual UX portfolios",
      "Fintech in Riyadh shows 42% YoY growth in Product Designer demand",
    ],
  };
}

export function demoResumeArchitect(fullName: string, locale: "en" | "ar"): ResumeArchitectResult {
  const isAr = locale === "ar";
  return {
    sections: [
      {
        heading: isAr ? "الملخص المهني" : "Professional Summary",
        content: isAr
          ? `${fullName} — مصمم منتجات بخبرة 10+ سنوات في SaaS المؤسسي`
          : `${fullName} — Product designer with 10+ years in enterprise SaaS`,
      },
      {
        heading: isAr ? "الخبرة" : "Experience",
        content: isAr ? "قائد تصميم منتجات — TechCorp Global (2022–الحالي)" : "Lead Product Designer — TechCorp Global (2022–Present)",
      },
    ],
    pdfReadyHtml: `<html><body><h1>${fullName}</h1><p>VORA AI Generated Resume</p></body></html>`,
    atsTips: isAr
      ? ["استخدم عناوين أقسام قياسية", "تجنب الجداول والأعمدة"]
      : ["Use standard section headings", "Avoid tables and multi-column layouts"],
  };
}

export function demoATSScan(input: ATSScanInput): ATSScanResult {
  const matched = input.requiredSkills.filter((s) =>
    input.resumeText.toLowerCase().includes(s.toLowerCase())
  );
  const gaps = input.requiredSkills.filter((s) => !matched.includes(s));
  const score = Math.round((matched.length / Math.max(input.requiredSkills.length, 1)) * 100);

  return {
    matchScore: Math.min(score + 12, 94),
    keywordGaps: gaps.length ? gaps : ["Kubernetes", "CI/CD"],
    matchedKeywords: matched.length ? matched : ["Product Design", "Figma"],
    formattingIssues: input.locale === "ar"
      ? ["تأكد من وجود قسم مهارات منفصل", "استخدم خطاً قياسياً"]
      : ["Ensure a dedicated Skills section exists", "Use standard fonts (Arial, Calibri)"],
    recommendations: input.locale === "ar"
      ? ["أضف الكلمات المفتاحية المفقودة في قسم المهارات", "طابق عنوان الوظيفة في الملخص"]
      : ["Add missing keywords to Skills section", "Mirror job title in summary line"],
  };
}

export function demoCandidateRank(input: CandidateRankInput): CandidateRankResult {
  return {
    rankings: input.candidates.map((c, i) => ({
      id: c.id,
      matchScore: Math.max(62, 94 - i * 8 + (c.professionalScore > 80 ? 5 : 0)),
      autoShortlisted: i === 0,
      strengths: ["Strong professional score", "Relevant headline match"],
      gaps: i > 1 ? ["Missing 2 required skills"] : [],
    })),
  };
}

export function demoServiceOptimize(input: ServiceOptimizeInput): ServiceOptimizeResult {
  return {
    improvedTitle: {
      en: `Professional ${input.title} — Fast Delivery & Revisions`,
      ar: `${input.title} احترافي — تسليم سريع مع مراجعات`,
    },
    seoTags: {
      en: ["logo design", "brand identity", "Saudi Arabia", "freelance", input.category.toLowerCase()],
      ar: ["تصميم شعار", "هوية بصرية", "السعودية", "خدمات مصغرة", input.category],
    },
    descriptionTips: input.locale === "ar"
      ? ["ابدأ بفقرة 'ماذا ستحصل' بالتعداد", "أضف FAQ بالعربية والإنجليزية"]
      : ["Start with a 'What You Get' bullet list", "Add bilingual FAQ section"],
    titleScore: 78,
  };
}

export function demoPricingRecommend(input: PricingRecommendInput): PricingRecommendResult {
  const base = input.category === "Development" ? 2500 : input.category === "Design" ? 299 : 150;
  const dayFactor = Math.max(1, input.deliveryDays / 5);
  const recommended = Math.round(base * dayFactor);

  return {
    recommendedPriceSar: recommended,
    priceRange: { min: Math.round(recommended * 0.75), max: Math.round(recommended * 1.4) },
    marketComparison: `Similar ${input.category} services on VORA average SR ${Math.round(recommended * 0.95)}–${Math.round(recommended * 1.15)}`,
    tiers: [
      { label: "Basic", priceSar: Math.round(recommended * 0.7), description: "Core deliverable only" },
      { label: "Standard", priceSar: recommended, description: "Recommended — includes 2 revisions" },
      { label: "Premium", priceSar: Math.round(recommended * 1.5), description: "Priority + extras + source files" },
    ],
  };
}

export function demoOwnerForecast(): OwnerForecastResult {
  return {
    quarterlyProjections: [
      { quarter: "Q3 2026", revenueSar: 712000, growthPercent: 8.2 },
      { quarter: "Q4 2026", revenueSar: 798000, growthPercent: 12.1 },
      { quarter: "Q1 2027", revenueSar: 891000, growthPercent: 11.6 },
      { quarter: "Q2 2027", revenueSar: 985000, growthPercent: 10.5 },
    ],
    churnRatePercent: 4.2,
    churnPrediction: "Premium monthly churn may rise 0.8% without yearly upgrade nudges",
    anomalies: [
      { type: "Activity Drop", description: "Video & Animation category down 18% this week", severity: "medium" },
      { type: "Emerging Trend", description: "AI consulting services up 240% in new listings", severity: "high" },
    ],
    emergingTrends: [
      { category: "AI & Automation Services", growthPercent: 240, insight: "Highest growth category in KSA freelance market" },
      { category: "Arabic Content & Localization", growthPercent: 67, insight: "Corporate demand from Vision 2030 initiatives" },
    ],
  };
}

export function demoMatchmaking(input: MatchmakingInput): MatchmakingResult {
  const isAr = input.locale === "ar";
  return {
    recommendedJobs: [
      {
        id: "job-1",
        title: isAr ? "مصمم منتجات أول" : "Senior Product Designer",
        company: "TechCorp Global",
        matchScore: 92,
        reason: isAr ? "تطابق دلالي عالٍ مع مهارات UX وFigma" : "High semantic match on UX & Figma skills",
      },
      {
        id: "job-2",
        title: isAr ? "قائد UX" : "UX Lead — Fintech",
        company: "Gulf Ventures",
        matchScore: 87,
        reason: isAr ? "السوق السعودي للفintech ينمو 42%" : "Strong fintech sector alignment in KSA",
      },
    ],
    recommendedServices: [
      {
        id: "svc-1",
        title: isAr ? "تصميم هوية بصرية" : "Brand Identity Package",
        storeName: "Alex Design Studio",
        priceSar: 599,
        matchScore: 85,
        reason: isAr ? "مناسب لمتطلبات مشروعك الحالي" : "Matches your current project requirements",
      },
    ],
  };
}
