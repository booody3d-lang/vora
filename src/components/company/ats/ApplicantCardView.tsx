"use client";

import Link from "next/link";
import type { ApplicantCard } from "@/types/company";
import { getApplicantReviewUrl } from "@/lib/company/mock-data";

interface ApplicantCardViewProps {
  applicant: ApplicantCard;
  jobId: string;
  onDragStart: (e: React.DragEvent, applicantId: string) => void;
}

export function ApplicantCardView({ applicant, jobId, onDragStart }: ApplicantCardViewProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, applicant.id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        <img
          src={applicant.profilePhotoUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-slate-200"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0F172A]">{applicant.fullName}</p>
          <p className="truncate text-[10px] text-slate-500">{applicant.headline}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-[#3B5998]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B5998]">
              {applicant.professionalScore}%
            </span>
            {applicant.hrRating && (
              <span className="text-[10px] text-amber-500">
                {"★".repeat(applicant.hrRating)}{"☆".repeat(5 - applicant.hrRating)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <a
          href={applicant.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-slate-200 py-1 text-center text-[10px] font-medium text-slate-600 hover:bg-slate-50"
        >
          📄 Resume
        </a>
        {applicant.videoPitchUrl && (
          <Link
            href={getApplicantReviewUrl(jobId, applicant.applicationId)}
            className="flex-1 rounded border border-[#3B5998]/30 bg-[#3B5998]/5 py-1 text-center text-[10px] font-medium text-[#3B5998] hover:bg-[#3B5998]/10"
          >
            🎬 Review
          </Link>
        )}
      </div>
    </div>
  );
}
