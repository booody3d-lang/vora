import Link from "next/link";
import { DEMO_COMPANY, DEMO_JOBS, DEMO_SUBSCRIPTION, computeSubscriptionState } from "@/lib/company/mock-data";
import { getAtsUrl } from "@/lib/company/mock-data";

export default function CompanyDashboardPage() {
  const subState = computeSubscriptionState(DEMO_SUBSCRIPTION);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Welcome, {DEMO_COMPANY.name}</h1>
        <p className="text-sm text-slate-500">Company recruitment dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Jobs" value={String(DEMO_JOBS.filter((j) => j.status === "active").length)} />
        <StatCard label="Total Applications" value="42" />
        <StatCard label="Followers" value={DEMO_COMPANY.followerCount.toLocaleString()} />
        <StatCard label="Free Jobs Left" value={String(subState.freeJobsRemaining)} highlight={subState.freeJobsRemaining <= 1} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link href="/company/dashboard/jobs/new" className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50">
              + Post New Job Vacancy
            </Link>
            <Link href="/company/dashboard/jobs" className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50">
              Manage Job Listings
            </Link>
            <Link href={getAtsUrl("job-1")} className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50">
              Open ATS Pipeline
            </Link>
            <Link href="/company/dashboard/analytics" className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-[#3B5998] hover:bg-slate-50">
              View Analytics
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">Access Restrictions</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Cannot create freelance stores</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Cannot list freelance services</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Cannot purchase individual premium plans</li>
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Company pages & job postings</li>
            <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> ATS pipeline & video review</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
