import { KanbanBoard } from "@/components/company/ats/KanbanBoard";
import { listApplicantsForJob } from "@/lib/company/applications-store";
import { getCompanyByAccountId } from "@/lib/company/company-store";
import { getJobByIdForAccount } from "@/lib/company/jobs-store";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound, redirect } from "next/navigation";

interface AtsPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function AtsPage({ params }: AtsPageProps) {
  const { jobId } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const denied = await forbidCompanyAts(auth.user);
  if (denied) redirect("/billing/plans");

  const job = await getJobByIdForAccount(auth.user.id, jobId);
  if (!job) notFound();

  const [applicants, company] = await Promise.all([
    listApplicantsForJob(auth.user.id, jobId),
    getCompanyByAccountId(auth.user.id),
  ]);

  return (
    <div className="mx-auto max-w-[100%] overflow-x-auto px-4 py-6 md:px-6">
      <KanbanBoard
        jobId={jobId}
        jobTitle={job.title}
        companyName={company?.name}
        jobDescription={job.description}
        requiredSkills={job.requiredSkills}
        initialApplicants={applicants}
      />
    </div>
  );
}
