"use client";

import { useCallback, useState } from "react";
import type { ApplicantCard, AtsStage } from "@/types/company";
import { ATS_STAGES } from "@/types/company";
import { ApplicantCardView } from "@/components/company/ats/ApplicantCardView";
import { CandidateRankingPanel } from "@/components/ai/company/CandidateRankingPanel";
import { groupApplicantsByStage } from "@/lib/company/ats-utils";
import { useNotificationTrigger } from "@/hooks/useNotificationTrigger";
import { applicationStatusAlert } from "@/lib/notifications/triggers";

interface KanbanBoardProps {
  jobId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription?: string;
  requiredSkills?: string[];
  initialApplicants: ApplicantCard[];
}

export function KanbanBoard({
  jobId,
  jobTitle,
  companyName = "Company",
  jobDescription = "",
  requiredSkills = [],
  initialApplicants,
}: KanbanBoardProps) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { fire } = useNotificationTrigger();

  const grouped = groupApplicantsByStage(applicants);

  const handleDragStart = useCallback((e: React.DragEvent, applicantId: string) => {
    setDraggedId(applicantId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", applicantId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStage: AtsStage) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || draggedId;
      if (!id) return;

      const applicant = applicants.find((entry) => entry.id === id);
      if (!applicant || applicant.stage === targetStage) {
        setDraggedId(null);
        return;
      }

      const sortOrder = grouped[targetStage].length;
      const previousApplicants = applicants;

      setApplicants((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, stage: targetStage, sortOrder } : entry
        )
      );
      setError(null);

      try {
        const res = await fetch(
          `/api/company/jobs/${jobId}/applications/${applicant.applicationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ stage: targetStage, sortOrder }),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to update stage");
        }

        const stageLabel = ATS_STAGES.find((stage) => stage.id === targetStage)?.label ?? targetStage;
        void fire(applicationStatusAlert(applicant.fullName, jobTitle, stageLabel, companyName));

        if (targetStage === "hired") {
          setNotification(`Congratulatory email sent to ${applicant.fullName}`);
        } else if (targetStage === "rejected") {
          setNotification(`Professional rejection notification sent to ${applicant.fullName}`);
        }
      } catch (persistError) {
        setApplicants(previousApplicants);
        setError(
          persistError instanceof Error ? persistError.message : "Failed to save stage change"
        );
      }

      setDraggedId(null);
      setTimeout(() => setNotification(null), 4000);
    },
    [applicants, draggedId, grouped, fire, jobId, jobTitle, companyName]
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">ATS Pipeline</h1>
          <p className="text-sm text-slate-500">{jobTitle}</p>
        </div>
        <p className="text-sm text-slate-400">{applicants.length} applicants</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notification && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notification}
        </div>
      )}

      <div className="mb-6">
        <CandidateRankingPanel
          jobTitle={jobTitle}
          jobDescription={jobDescription}
          requiredSkills={requiredSkills}
          applicants={applicants}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {ATS_STAGES.map((stage) => (
          <div
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={(e) => void handleDrop(e, stage.id)}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50"
            style={{ minHeight: 400 }}
          >
            <div
              className="rounded-t-xl px-3 py-2.5"
              style={{ backgroundColor: `${stage.color}15`, borderBottom: `2px solid ${stage.color}` }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0F172A]">{stage.label}</h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: stage.color }}
                >
                  {grouped[stage.id].length}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 520 }}>
              {grouped[stage.id].map((applicant) => (
                <ApplicantCardView
                  key={applicant.id}
                  applicant={applicant}
                  jobId={jobId}
                  onDragStart={handleDragStart}
                />
              ))}
              {grouped[stage.id].length === 0 && (
                <p className="py-8 text-center text-[10px] text-slate-400">
                  Drop candidates here
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
