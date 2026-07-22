import { calculateProfessionalScore } from "@/lib/professional-score/calculator";

import type { FullProfessionalProfile } from "@/types/network";



export const ONBOARDING_STEPS = [

  "photo",

  "cover",

  "about",

  "education",

  "experience",

  "skills",

  "projects",

  "video",

  "resume",

] as const;



export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];



function hasValue(value?: string | null): boolean {

  return Boolean(value && value.trim().length > 0);

}



export function isOnboardingStepComplete(

  step: OnboardingStep,

  profile: FullProfessionalProfile

): boolean {

  switch (step) {

    case "photo":

      return hasValue(profile.profilePhotoUrl);

    case "cover":

      return hasValue(profile.coverImageUrl);

    case "about":

      return hasValue(profile.headline) && hasValue(profile.about);

    case "education":

      return profile.education.length >= 1;

    case "experience":

      return profile.experiences.filter((item) => item.isVerified).length >= 1;

    case "skills":

      return profile.skills.length >= 3;

    case "projects":

      return profile.projects.length >= 1;

    case "video":

      return hasValue(profile.videoIntroUrl);

    case "resume":

      return hasValue(profile.resumeUrl);

    default:

      return false;

  }

}



export function getOnboardingProgress(profile: FullProfessionalProfile) {

  const completedSteps = ONBOARDING_STEPS.filter((step) =>

    isOnboardingStepComplete(step, profile)

  );

  const score = calculateProfessionalScore({

    profilePhotoUrl: profile.profilePhotoUrl,

    coverImageUrl: profile.coverImageUrl,

    headline: profile.headline,

    about: profile.about,

    resumeUrl: profile.resumeUrl,

    videoIntroUrl: profile.videoIntroUrl,

    verifiedExperienceCount: profile.experiences.filter((item) => item.isVerified).length,

    verifiedEducationCount: profile.education.filter((item) => item.isVerified).length,

    skillCount: profile.skills.length,

    certificationCount: profile.certifications.length,

  }).total;



  return {

    completedSteps,

    completedCount: completedSteps.length,

    totalSteps: ONBOARDING_STEPS.length,

    percent: Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100),

    score,

  };

}



export function isOnboardingComplete(profile: FullProfessionalProfile): boolean {

  if (profile.onboardingCompletedAt) return true;



  const progress = getOnboardingProgress(profile);

  return (

    progress.completedCount === ONBOARDING_STEPS.length &&

    progress.score >= 100

  );

}



export function getFirstIncompleteOnboardingStep(

  profile: FullProfessionalProfile

): OnboardingStep {

  return ONBOARDING_STEPS.find((step) => !isOnboardingStepComplete(step, profile)) ?? "resume";

}



/** Post-login destination — onboarding is never forced. */

export function getPostAuthDestination(role: string): string {

  if (role === "company") return "/company/dashboard";

  if (role === "admin" || role === "owner") return "/admin";

  if (role === "professional") return "/network";

  return "/profile/me";

}


