import { JobCreatorWizard } from "@/components/company/jobs/JobCreatorWizard";

export default function NewJobPage() {
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#0F172A]">Create Job Vacancy</h1>
        <p className="text-sm text-slate-500">Structured wizard for HR managers</p>
      </div>
      <JobCreatorWizard />
    </div>
  );
}
