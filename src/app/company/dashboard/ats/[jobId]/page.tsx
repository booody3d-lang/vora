import { KanbanBoard } from "@/components/company/ats/KanbanBoard";
import { DEMO_APPLICANTS, DEMO_JOBS } from "@/lib/company/mock-data";
import { notFound } from "next/navigation";

interface AtsPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function AtsPage({ params }: AtsPageProps) {
  const { jobId } = await params;
  const job = DEMO_JOBS.find((j) => j.id === jobId);

  if (!job) {
    notFound();
  }

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
