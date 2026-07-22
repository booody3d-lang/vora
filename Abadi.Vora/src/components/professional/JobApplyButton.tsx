"use client";

import { useJobApplyGuard } from "@/hooks/useJobApplyGuard";
import type { ProfessionalProfileInput } from "@/types/vora";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";

interface JobApplyButtonProps {
  jobId: string;
  jobTitle: string;
  profile: ProfessionalProfileInput;
}

export function JobApplyButton({ jobId, jobTitle, profile }: JobApplyButtonProps) {
  const { attemptApply, eligibility, ApplyGuardModal } = useJobApplyGuard(profile);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          attemptApply(() => {
            // Application flow will be wired in a future phase
            console.info(`Applying to job ${jobId}: ${jobTitle}`);
          })
        }
        className="rounded-lg bg-[var(--vora-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Apply
      </button>
      {ApplyGuardModal}
      <span className="sr-only">
        Current professional score: {eligibility.score}%. Resume uploaded:{" "}
        {eligibility.hasResume ? "yes" : "no"}.
      </span>
    </>
  );
}

interface ApplicantScoreBadgeProps {
  score: number;
  applicantName: string;
}

export function ApplicantScoreBadge({ score, applicantName }: ApplicantScoreBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#3B5998]/10 bg-white p-3">
      <ProfessionalScoreRing score={score} size={56} strokeWidth={4} showBadge />
      <div>
        <p className="text-sm font-semibold text-[var(--vora-primary-dark)]">{applicantName}</p>
        <p className="text-xs text-[var(--vora-muted)]">Professional Score</p>
      </div>
    </div>
  );
}

interface ProfileWithStoreLinkProps {
  storeHref: string;
  profile: ProfessionalProfileInput;
}

export function ProfileWithStoreLink({ storeHref, profile }: ProfileWithStoreLinkProps) {
  const { eligibility } = useJobApplyGuard(profile);

  return (
    <div className="rounded-xl border border-[#3B5998]/10 bg-white p-6">
      <div className="flex items-start justify-between">
        <ProfessionalScoreRing score={eligibility.score} size={80} strokeWidth={5} />
        <CrossPlatformLink type="visit-store" href={storeHref} />
      </div>
    </div>
  );
}
