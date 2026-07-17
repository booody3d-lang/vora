import type { CompanySubscription } from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR, FREE_JOBS_LIMIT, TRIAL_DAYS } from "@/types/company";

export interface CompanyPermissions {
  isCompanyAccount: boolean;
  canCreateCompanyPage: boolean;
  canPublishJobs: boolean;
  canManageAts: boolean;
  canViewAnalytics: boolean;
  canCreateFreelanceStore: false;
  canBuyPremiumPlan: false;
  canListFreelanceServices: false;
}

export function resolveCompanyPermissions(
  isCompany: boolean,
  subscriptionCanPublish: boolean
): CompanyPermissions {
  return {
    isCompanyAccount: isCompany,
    canCreateCompanyPage: isCompany,
    canPublishJobs: isCompany && subscriptionCanPublish,
    canManageAts: isCompany,
    canViewAnalytics: isCompany,
    canCreateFreelanceStore: false,
    canBuyPremiumPlan: false,
    canListFreelanceServices: false,
  };
}

export function evaluatePublishGuard(sub: CompanySubscription): {
  allowed: boolean;
  reason?: string;
} {
  const now = Date.now();
  const trialEnd = new Date(sub.trialEndsAt).getTime();
  const trialExpired = trialEnd <= now;
  const jobsExceeded = sub.jobsPublishedCount >= FREE_JOBS_LIMIT;

  if (sub.status === "active" && sub.subscriptionExpiresAt) {
    if (new Date(sub.subscriptionExpiresAt).getTime() > now) {
      return { allowed: true };
    }
  }

  if (!trialExpired && !jobsExceeded) {
    return { allowed: true };
  }

  if (trialExpired && jobsExceeded) {
    return {
      allowed: false,
      reason: `Trial period (${TRIAL_DAYS} days) ended and all ${FREE_JOBS_LIMIT} free job slots are used.`,
    };
  }
  if (trialExpired) {
    return { allowed: false, reason: "Your 3-month free trial has expired." };
  }
  return {
    allowed: false,
    reason: `You've used all ${FREE_JOBS_LIMIT} free job postings.`,
  };
}

export function getPaywallMessage(): string {
  return `Subscribe to VORA Company for SAR ${ANNUAL_SUBSCRIPTION_SAR}/year to publish unlimited jobs.`;
}
