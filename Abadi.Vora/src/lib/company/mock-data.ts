import type {
  ApplicantCard,
  AtsStage,
  CompanyAnalytics,
  CompanyPost,
  CompanyProfile,
  CompanySubscription,
  InternalNote,
  JobPosting,
} from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR, FREE_JOBS_LIMIT } from "@/types/company";

export const DEMO_COMPANY: CompanyProfile = {
  id: "co-1",
  slug: "techcorp-global",
  name: "TechCorp Global",
  tagline: "Innovating the future of enterprise technology",
  logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=TechCorp",
  coverImageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=300&fit=crop",
  about: "TechCorp Global is a leading enterprise technology company serving Fortune 500 clients across 40+ countries. Founded in 2008, we specialize in cloud infrastructure, AI-driven analytics, and digital transformation consulting. Our mission is to empower organizations to build resilient, scalable technology ecosystems.",
  industry: "Enterprise Software",
  sizeRange: "1,001-5,000 employees",
  headquarters: "Dubai, UAE",
  websiteUrl: "https://techcorp.example.com",
  isVerified: true,
  employeeCount: 2840,
  followerCount: 12400,
  branches: [
    { city: "Dubai", country: "UAE" },
    { city: "London", country: "UK" },
    { city: "Singapore", country: "Singapore" },
    { city: "New York", country: "USA" },
  ],
  announcement: "We're expanding our Product Design team — 5 new roles open globally!",
};

export const DEMO_SUBSCRIPTION: CompanySubscription = {
  status: "trial",
  trialStartedAt: "2026-05-17T00:00:00Z",
  trialEndsAt: "2026-08-17T00:00:00Z",
  jobsPublishedCount: 2,
  freeJobsLimit: FREE_JOBS_LIMIT,
  annualPriceSar: ANNUAL_SUBSCRIPTION_SAR,
};

export const DEMO_JOBS: JobPosting[] = [
  {
    id: "job-1",
    slug: "senior-product-designer",
    companyId: "co-1",
    title: "Senior Product Designer",
    description: "Lead product design for our enterprise analytics platform...",
    location: "Dubai, UAE",
    workLocation: "hybrid",
    employmentType: "full_time",
    salaryMin: 25000,
    salaryMax: 35000,
    showSalary: true,
    requiredSkills: ["Product Design", "Figma", "Design Systems", "User Research"],
    requireVideoPitch: true,
    status: "active",
    impressions: 4200,
    clicks: 890,
    applicationCount: 24,
    createdAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "job-2",
    slug: "ux-lead",
    companyId: "co-1",
    title: "UX Lead",
    description: "Drive UX strategy across multiple product lines...",
    location: "Remote",
    workLocation: "remote",
    employmentType: "full_time",
    showSalary: false,
    requiredSkills: ["UX Strategy", "Leadership", "Workshop Facilitation"],
    requireVideoPitch: false,
    status: "active",
    impressions: 3100,
    clicks: 620,
    applicationCount: 18,
    createdAt: "2026-06-15T00:00:00Z",
  },
];

export const DEMO_APPLICANTS: ApplicantCard[] = [
  {
    id: "app-1",
    applicationId: "ja-1",
    accountId: "user-1",
    fullName: "Alex Morgan",
    headline: "Lead Product Designer",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    professionalScore: 78,
    resumeUrl: "/sample-resume.pdf",
    videoPitchUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    stage: "new_applications",
    sortOrder: 0,
    appliedAt: "2026-07-14T10:00:00Z",
  },
  {
    id: "app-2",
    applicationId: "ja-2",
    accountId: "user-6",
    fullName: "Priya Sharma",
    headline: "Senior UX Designer · 8 yrs exp",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    professionalScore: 85,
    resumeUrl: "/sample-resume.pdf",
    videoPitchUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    stage: "under_review",
    sortOrder: 0,
    appliedAt: "2026-07-13T14:00:00Z",
    hrRating: 4,
  },
  {
    id: "app-3",
    applicationId: "ja-3",
    accountId: "user-7",
    fullName: "James Okonkwo",
    headline: "Product Designer · Design Systems",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    professionalScore: 72,
    resumeUrl: "/sample-resume.pdf",
    stage: "interview_scheduled",
    sortOrder: 0,
    appliedAt: "2026-07-12T09:00:00Z",
  },
  {
    id: "app-4",
    applicationId: "ja-4",
    accountId: "user-8",
    fullName: "Elena Vasquez",
    headline: "UX Research Lead",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaV",
    professionalScore: 91,
    resumeUrl: "/sample-resume.pdf",
    videoPitchUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    stage: "final_review",
    sortOrder: 0,
    appliedAt: "2026-07-10T16:00:00Z",
    hrRating: 5,
  },
  {
    id: "app-5",
    applicationId: "ja-5",
    accountId: "user-9",
    fullName: "Tom Bradley",
    headline: "Junior Designer",
    profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
    professionalScore: 55,
    resumeUrl: "/sample-resume.pdf",
    stage: "rejected",
    sortOrder: 0,
    appliedAt: "2026-07-08T11:00:00Z",
    hrRating: 2,
  },
];

export const DEMO_NOTES: Record<string, InternalNote[]> = {
  "ja-2": [
    { id: "n1", authorName: "HR Manager", content: "Strong portfolio. Schedule technical interview.", createdAt: "2026-07-14T09:00:00Z" },
    { id: "n2", authorName: "Design Director", content: "Excellent design systems experience. Recommended for next round.", createdAt: "2026-07-14T15:00:00Z" },
  ],
};

export const DEMO_COMPANY_POSTS: CompanyPost[] = [
  {
    id: "cp1",
    type: "job_announcement",
    content: "We're hiring! 5 new Product Design roles across Dubai and Remote.",
    jobTitle: "Senior Product Designer",
    createdAt: "2026-07-15T10:00:00Z",
  },
  {
    id: "cp2",
    type: "text",
    content: "TechCorp Global ranked #3 Best Workplace in MENA 2026 by Great Place to Work. Proud of our team!",
    createdAt: "2026-07-10T08:00:00Z",
  },
  {
    id: "cp3",
    type: "image",
    content: "Our new Dubai headquarters opening ceremony — thank you to everyone who joined us!",
    mediaUrls: ["https://images.unsplash.com/photo-1497366811353-6870734fda1b?w=600&h=300&fit=crop"],
    createdAt: "2026-07-05T12:00:00Z",
  },
];

export const DEMO_ANALYTICS: CompanyAnalytics = {
  followerGrowth: [
    { date: "Jun 1", count: 9800 },
    { date: "Jun 8", count: 10100 },
    { date: "Jun 15", count: 10500 },
    { date: "Jun 22", count: 10900 },
    { date: "Jun 29", count: 11200 },
    { date: "Jul 6", count: 11600 },
    { date: "Jul 13", count: 12000 },
    { date: "Jul 16", count: 12400 },
  ],
  applicationsVsHires: [
    { month: "Mar", applications: 45, hires: 3 },
    { month: "Apr", applications: 62, hires: 5 },
    { month: "May", applications: 58, hires: 4 },
    { month: "Jun", applications: 78, hires: 6 },
    { month: "Jul", applications: 42, hires: 2 },
  ],
  jobPerformance: [
    { jobTitle: "Senior Product Designer", impressions: 4200, clicks: 890, applications: 24, conversionRate: 2.7 },
    { jobTitle: "UX Lead", impressions: 3100, clicks: 620, applications: 18, conversionRate: 2.9 },
  ],
  scoreDistribution: [
    { range: "0-40%", count: 3 },
    { range: "41-60%", count: 8 },
    { range: "61-80%", count: 18 },
    { range: "81-100%", count: 13 },
  ],
};

export function getCompanyPublicUrl(slug: string) {
  return `/network/company/${slug}`;
}

export function getAtsUrl(jobId: string) {
  return `/company/dashboard/ats/${jobId}`;
}

export function getApplicantReviewUrl(jobId: string, applicantId: string) {
  return `/company/dashboard/ats/${jobId}/review/${applicantId}`;
}

export function computeSubscriptionState(sub: CompanySubscription): {
  canPublish: boolean;
  isPaywallActive: boolean;
  daysRemaining: number;
  freeJobsRemaining: number;
  message: string;
} {
  const now = Date.now();
  const trialEnd = new Date(sub.trialEndsAt).getTime();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
  const freeJobsRemaining = Math.max(0, sub.freeJobsLimit - sub.jobsPublishedCount);

  if (sub.status === "active" && sub.subscriptionExpiresAt) {
    const subEnd = new Date(sub.subscriptionExpiresAt).getTime();
    if (subEnd > now) {
      return {
        canPublish: true,
        isPaywallActive: false,
        daysRemaining,
        freeJobsRemaining,
        message: `Active subscription until ${new Date(sub.subscriptionExpiresAt).toLocaleDateString()}`,
      };
    }
  }

  const trialActive = trialEnd > now;
  const jobsAvailable = sub.jobsPublishedCount < sub.freeJobsLimit;

  if (trialActive && jobsAvailable) {
    return {
      canPublish: true,
      isPaywallActive: false,
      daysRemaining,
      freeJobsRemaining,
      message: `${freeJobsRemaining} free job slot${freeJobsRemaining !== 1 ? "s" : ""} · ${daysRemaining} trial days left`,
    };
  }

  const reason = !trialActive && !jobsAvailable
    ? "Trial expired and free job limit reached"
    : !trialActive
      ? "3-month trial has expired"
      : "Free job limit (3) reached";

  return {
    canPublish: false,
    isPaywallActive: true,
    daysRemaining,
    freeJobsRemaining,
    message: `${reason}. Subscribe for SAR ${sub.annualPriceSar}/year to continue publishing.`,
  };
}

export function groupApplicantsByStage(applicants: ApplicantCard[]): Record<AtsStage, ApplicantCard[]> {
  const groups = {} as Record<AtsStage, ApplicantCard[]>;
  const stages: AtsStage[] = [
    "new_applications",
    "under_review",
    "interview_scheduled",
    "final_review",
    "hired",
    "rejected",
  ];
  for (const stage of stages) {
    groups[stage] = applicants
      .filter((a) => a.stage === stage)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return groups;
}
