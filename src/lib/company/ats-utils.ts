export function groupApplicantsByStage<T extends { stage: string; sortOrder: number }>(
  applicants: T[]
): Record<string, T[]> {
  const stages = [
    "new_applications",
    "under_review",
    "interview_scheduled",
    "final_review",
    "hired",
    "rejected",
  ] as const;

  const groups = {} as Record<string, T[]>;
  for (const stage of stages) {
    groups[stage] = applicants
      .filter((applicant) => applicant.stage === stage)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return groups;
}
