import { VideoReviewPanel } from "@/components/company/ats/VideoReviewPanel";
import { DEMO_APPLICANTS, DEMO_NOTES } from "@/lib/company/mock-data";
import { getJobByIdForAccount } from "@/lib/company/jobs-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound } from "next/navigation";

interface ReviewPageProps {
  params: Promise<{ jobId: string; applicantId: string }>;
}

export default async function ApplicantReviewPage({ params }: ReviewPageProps) {
  const { jobId, applicantId } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const job = await getJobByIdForAccount(auth.user.id, jobId);
  const applicant = DEMO_APPLICANTS.find((a) => a.id === applicantId);

  if (!job || !applicant) {
    notFound();
  }

  const notes = DEMO_NOTES[applicant.applicationId] ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0F172A]">Video Application Review</h1>
        <p className="text-sm text-slate-500">
          {applicant.fullName} · {job.title}
        </p>
      </div>
      <VideoReviewPanel
        applicant={applicant}
        jobId={jobId}
        initialNotes={notes}
      />
    </div>
  );
}
