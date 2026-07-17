export type WorkLocation = "onsite" | "hybrid" | "remote";
export type EmploymentType = "full_time" | "part_time" | "contract";
export type AtsStage =
  | "new_applications"
  | "under_review"
  | "interview_scheduled"
  | "final_review"
  | "hired"
  | "rejected";
export type CompanyTab = "home" | "about" | "posts" | "jobs";
export type SubscriptionStatus = "trial" | "active" | "expired" | "locked";
export type CompanyPostType = "text" | "image" | "job_announcement";

export interface CompanyBranch {
  city: string;
  country: string;
}

export interface CompanyProfile {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  about?: string;
  industry?: string;
  sizeRange?: string;
  headquarters?: string;
  websiteUrl?: string;
  isVerified: boolean;
  employeeCount: number;
  followerCount: number;
  branches: CompanyBranch[];
  announcement?: string;
}

export interface CompanySubscription {
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  jobsPublishedCount: number;
  freeJobsLimit: number;
  subscriptionExpiresAt?: string;
  annualPriceSar: number;
}

export interface JobPosting {
  id: string;
  slug: string;
  companyId: string;
  title: string;
  description: string;
  location: string;
  workLocation: WorkLocation;
  employmentType: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  showSalary: boolean;
  requiredSkills: string[];
  requireVideoPitch: boolean;
  status: "draft" | "active" | "closed" | "archived";
  impressions: number;
  clicks: number;
  applicationCount: number;
  createdAt: string;
}

export interface JobPostingForm {
  title: string;
  location: string;
  workLocation: WorkLocation;
  employmentType: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  showSalary: boolean;
  description: string;
  requiredSkills: string[];
  requireVideoPitch: boolean;
}

export interface ApplicantCard {
  id: string;
  applicationId: string;
  accountId: string;
  fullName: string;
  headline: string;
  profilePhotoUrl: string;
  professionalScore: number;
  resumeUrl: string;
  videoPitchUrl?: string;
  stage: AtsStage;
  sortOrder: number;
  appliedAt: string;
  hrRating?: number;
}

export interface InternalNote {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CompanyPost {
  id: string;
  type: CompanyPostType;
  content: string;
  mediaUrls?: string[];
  jobTitle?: string;
  createdAt: string;
}

export interface SubscriptionState {
  canPublish: boolean;
  isPaywallActive: boolean;
  daysRemaining: number;
  freeJobsRemaining: number;
  message: string;
}

export interface CompanyAnalytics {
  followerGrowth: { date: string; count: number }[];
  applicationsVsHires: { month: string; applications: number; hires: number }[];
  jobPerformance: {
    jobTitle: string;
    impressions: number;
    clicks: number;
    applications: number;
    conversionRate: number;
  }[];
  scoreDistribution: { range: string; count: number }[];
}

export const ATS_STAGES: { id: AtsStage; label: string; color: string }[] = [
  { id: "new_applications", label: "New Applications", color: "#3B5998" },
  { id: "under_review", label: "Under Review", color: "#6366F1" },
  { id: "interview_scheduled", label: "Interview Scheduled", color: "#8B5CF6" },
  { id: "final_review", label: "Final Review", color: "#A855F7" },
  { id: "hired", label: "Hired", color: "#10B981" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
];

export const FREE_JOBS_LIMIT = 3;
export const TRIAL_DAYS = 90;
export const ANNUAL_SUBSCRIPTION_SAR = 600;
