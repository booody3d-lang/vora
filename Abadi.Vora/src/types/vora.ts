export type AccountTier = "visitor" | "basic" | "professional";

export type PlatformContext = "network" | "freelance";

export type SearchMode = "jobs" | "services";

export interface ProfessionalProfileInput {
  profilePhotoUrl?: string | null;
  coverImageUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  resumeUrl?: string | null;
  videoIntroUrl?: string | null;
  verifiedExperienceCount?: number;
  verifiedEducationCount?: number;
  skillCount?: number;
  certificationCount?: number;
}

export interface ProfessionalScoreBreakdown {
  total: number;
  photo: number;
  cover: number;
  headlineAbout: number;
  experience: number;
  education: number;
  skillsCertifications: number;
  resume: number;
  videoIntro: number;
}

export interface UserPermissions {
  tier: AccountTier;
  isAuthenticated: boolean;
  professionalUnlocked: boolean;
  hasFreelancerStore: boolean;
  hasProfessionalProfile: boolean;
  canBrowseFreelance: boolean;
  canBuyServices: boolean;
  canCreateStore: boolean;
  canListServices: boolean;
  canMessageSellers: boolean;
  canSaveServices: boolean;
  canApplyJobs: boolean;
  canFollowConnect: boolean;
  canNetworkMessage: boolean;
  canEngageContent: boolean;
  canLeaveRatings: boolean;
}

export interface VisitorViewState {
  profileViews: number;
  jobViews: number;
  limitReached: boolean;
}

export interface MissingProfileModule {
  id: string;
  label: string;
  href: string;
  completed: boolean;
}

export interface JobApplyEligibility {
  canApply: boolean;
  score: number;
  hasResume: boolean;
  missingModules: MissingProfileModule[];
}
