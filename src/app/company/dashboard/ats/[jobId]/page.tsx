import { KanbanBoard } from "@/components/company/ats/KanbanBoard";
import { DEMO_APPLICANTS } from "@/lib/company/mock-data";
import { getJobByIdForAccount } from "@/lib/company/jobs-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound } from "next/navigation";

interface AtsPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function AtsPage({ params }: AtsPageProps) {
  const { jobId } = await params;
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const job = await getJobByIdForAccount(auth.user.id, jobId);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-[100%] overflow-x-auto px-4 py-6 md:px-6">
      <KanbanBoard
        jobId={jobId}
        jobTitle={job.title}
        jobDescription={job.description}
        requiredSkills={job.requiredSkills}
        initialApplicants={DEMO_APPLICANTS}
      />
    </div>
  );
}
