import type {
  JobApplyEligibility,
  MissingProfileModule,
  ProfessionalProfileInput,
  ProfessionalScoreBreakdown,
} from "@/types/vora";

const WEIGHTS = {
  photo: 10,
  cover: 10,
  headlineAbout: 15,
  experience: 20,
  education: 15,
  skillsCertifications: 10,
  resume: 10,
  videoIntro: 10,
} as const;

export const PROFESSIONAL_SCORE_UNLOCK_THRESHOLD = 70;

function hasValue(value?: string | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function calculateProfessionalScore(
  profile: ProfessionalProfileInput
): ProfessionalScoreBreakdown {
  const photo = hasValue(profile.profilePhotoUrl) ? WEIGHTS.photo : 0;
  const cover = hasValue(profile.coverImageUrl) ? WEIGHTS.cover : 0;
  const headlineAbout =
    hasValue(profile.headline) && hasValue(profile.about) ? WEIGHTS.headlineAbout : 0;
  const experience =
    (profile.verifiedExperienceCount ?? 0) >= 1 ? WEIGHTS.experience : 0;
  const education =
    (profile.verifiedEducationCount ?? 0) >= 1 ? WEIGHTS.education : 0;
  const skillsCertifications =
    (profile.skillCount ?? 0) >= 3 || (profile.certificationCount ?? 0) >= 1
      ? WEIGHTS.skillsCertifications
      : 0;
  const resume = hasValue(profile.resumeUrl) ? WEIGHTS.resume : 0;
  const videoIntro = hasValue(profile.videoIntroUrl) ? WEIGHTS.videoIntro : 0;

  const total = Math.min(
    100,
    photo +
      cover +
      headlineAbout +
      experience +
      education +
      skillsCertifications +
      resume +
      videoIntro
  );

  return {
    total,
    photo,
    cover,
    headlineAbout,
    experience,
    education,
    skillsCertifications,
    resume,
    videoIntro,
  };
}

export function getMissingProfileModules(
  profile: ProfessionalProfileInput
): MissingProfileModule[] {
  const skillCount = profile.skillCount ?? 0;

  return [
    {
      id: "photo",
      label: "Professional Photo",
      href: "/network/profile/edit?section=photo",
      completed: hasValue(profile.profilePhotoUrl),
    },
    {
      id: "cover",
      label: "Premium Cover Image",
      href: "/network/profile/edit?section=cover",
      completed: hasValue(profile.coverImageUrl),
    },
    {
      id: "headline-about",
      label: "Headline & About",
      href: "/network/profile/edit?section=about",
      completed: hasValue(profile.headline) && hasValue(profile.about),
    },
    {
      id: "experience",
      label: "Verified Experience",
      href: "/network/profile/edit?section=experience",
      completed: (profile.verifiedExperienceCount ?? 0) >= 1,
    },
    {
      id: "education",
      label: "Education",
      href: "/network/profile/edit?section=education",
      completed: (profile.verifiedEducationCount ?? 0) >= 1,
    },
    {
      id: "skills",
      label: "Core Skills (min. 3)",
      href: "/network/profile/edit?section=skills",
      completed: skillCount >= 3,
    },
    {
      id: "resume",
      label: "Uploaded Resume (PDF)",
      href: "/network/profile/edit?section=resume",
      completed: hasValue(profile.resumeUrl),
    },
    {
      id: "video",
      label: "Video Introduction",
      href: "/network/profile/edit?section=video",
      completed: hasValue(profile.videoIntroUrl),
    },
  ];
}

export function isProfessionalProfileUnlocked(
  profile: ProfessionalProfileInput
): boolean {
  const breakdown = calculateProfessionalScore(profile);
  return (
    breakdown.total >= PROFESSIONAL_SCORE_UNLOCK_THRESHOLD &&
    hasValue(profile.profilePhotoUrl) &&
    hasValue(profile.coverImageUrl) &&
    hasValue(profile.headline) &&
    hasValue(profile.about) &&
    hasValue(profile.resumeUrl) &&
    (profile.verifiedExperienceCount ?? 0) >= 1 &&
    (profile.verifiedEducationCount ?? 0) >= 1 &&
    (profile.skillCount ?? 0) >= 3
  );
}

export function evaluateJobApplyEligibility(
  profile: ProfessionalProfileInput
): JobApplyEligibility {
  const breakdown = calculateProfessionalScore(profile);
  const hasResume = hasValue(profile.resumeUrl);
  const missingModules = getMissingProfileModules(profile).filter(
    (module) => !module.completed
  );

  const canApply =
    breakdown.total >= PROFESSIONAL_SCORE_UNLOCK_THRESHOLD && hasResume;

  return {
    canApply,
    score: breakdown.total,
    hasResume,
    missingModules,
  };
}
