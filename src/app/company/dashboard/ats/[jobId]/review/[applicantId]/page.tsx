import { VideoReviewPanel } from "@/components/company/ats/VideoReviewPanel";
import {
  getApplicantForJob,
  listInternalNotes,
} from "@/lib/company/applications-store";
import { getJobByIdForAccount } from "@/lib/company/jobs-store";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound, redirect } from "next/navigation";

interface ReviewPageProps {
  params: Promise<{ jobId: string; applicantId: string }>;
}

export default async function ApplicantReviewPage({ params }: ReviewPageProps) {
  const { jobId, applicantId } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const denied = await forbidCompanyAts(auth.user);
  if (denied) redirect("/billing/plans");

  const job = await getJobByIdForAccount(auth.user.id, jobId);
  if (!job) notFound();

  const applicant = await getApplicantForJob(auth.user.id, jobId, applicantId);
  if (!applicant) notFound();

  const notes = await listInternalNotes(auth.user.id, jobId, applicantId);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0F172A]">Video Application Review</h1>
        <p className="text-sm text-slate-500">
          {applicant.fullName} · {job.title}
        </p>
      </div>
      <VideoReviewPanel applicant={applicant} jobId={jobId} initialNotes={notes} />
    </div>
  );
}
