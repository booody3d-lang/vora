import { calculateProfessionalScore, evaluateJobApplyEligibility } from "@/lib/professional-score/calculator";
import type { ProfessionalProfileInput } from "@/types/vora";

/**
 * Reference scenarios for Professional Score validation.
 * Run with: npx tsx src/lib/professional-score/scenarios.ts (after npm install)
 */

const emptyProfile: ProfessionalProfileInput = {};

const partialProfile: ProfessionalProfileInput = {
  profilePhotoUrl: "https://example.com/photo.jpg",
  headline: "Product Designer",
  about: "10 years of experience.",
  verifiedExperienceCount: 1,
  skillCount: 2,
};

const completeProfile: ProfessionalProfileInput = {
  profilePhotoUrl: "https://example.com/photo.jpg",
  coverImageUrl: "https://example.com/cover.jpg",
  headline: "Senior Product Designer",
  about: "Building premium digital experiences for global brands.",
  verifiedExperienceCount: 2,
  verifiedEducationCount: 1,
  skillCount: 5,
  certificationCount: 1,
  resumeUrl: "https://example.com/resume.pdf",
  videoIntroUrl: "https://example.com/pitch.mp4",
};

function logScenario(name: string, profile: ProfessionalProfileInput) {
  const score = calculateProfessionalScore(profile);
  const eligibility = evaluateJobApplyEligibility(profile);
  console.log(`\n--- ${name} ---`);
  console.log("Score:", score.total, score);
  console.log("Can apply:", eligibility.canApply);
  console.log("Missing:", eligibility.missingModules.filter((m) => !m.completed).map((m) => m.label));
}

logScenario("Empty Profile", emptyProfile);
logScenario("Partial Profile", partialProfile);
logScenario("Complete Profile", completeProfile);
