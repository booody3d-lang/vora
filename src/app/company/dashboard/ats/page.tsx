import Link from "next/link";
import { listJobsForAccount } from "@/lib/company/jobs-store";
import { getAtsUrl } from "@/lib/company/mock-data";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound, redirect } from "next/navigation";

export default async function AtsIndexPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const denied = await forbidCompanyAts(auth.user);
  if (denied) redirect("/billing/plans?audience=company");

  const jobs = await listJobsForAccount(auth.user.id);
  const pipelineJobs = jobs.filter((job) => job.status === "active" || job.status === "draft");

  if (pipelineJobs.length === 1) {
    redirect(getAtsUrl(pipelineJobs[0].id));
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">ATS Pipeline</h1>
        <p className="text-sm text-slate-500">Select a job to manage applicants</p>
      </div>

      {pipelineJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No jobs available for ATS yet.</p>
          <Link
            href="/company/dashboard/jobs/new"
            className="mt-4 inline-block text-sm font-semibold text-[#3B5998] hover:underline"
          >
            Post your first job
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pipelineJobs.map((job) => (
            <li key={job.id}>
              <Link
                href={getAtsUrl(job.id)}
                className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-[#3B5998]/30 hover:bg-[#3B5998]/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-semibold text-[#0F172A]">{job.title}</h2>
                  <p className="text-xs text-slate-500">
                    {job.location} · {job.applicationCount} applications
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#3B5998]">Open pipeline →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
