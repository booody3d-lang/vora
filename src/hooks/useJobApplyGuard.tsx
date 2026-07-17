"use client";

import { useState } from "react";
import { evaluateJobApplyEligibility } from "@/lib/professional-score/calculator";
import type { ProfessionalProfileInput } from "@/types/vora";
import { JobApplyGuardModal } from "@/components/professional/JobApplyGuardModal";
import { usePermissions } from "@/providers/VoraProviders";

export function useJobApplyGuard(profile: ProfessionalProfileInput) {
  const { permissions } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const eligibility = evaluateJobApplyEligibility(profile);

  function attemptApply(onSuccess: () => void) {
    if (!permissions.isAuthenticated) {
      setShowModal(true);
      return;
    }

    if (!permissions.canApplyJobs || !eligibility.canApply) {
      setShowModal(true);
      return;
    }

    onSuccess();
  }

  const ApplyGuardModal = (
    <JobApplyGuardModal
      open={showModal}
      onClose={() => setShowModal(false)}
      score={eligibility.score}
      missingModules={eligibility.missingModules}
    />
  );

  return {
    attemptApply,
    eligibility,
    ApplyGuardModal,
  };
}
