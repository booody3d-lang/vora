"use client";

import type { CompanyAnalytics } from "@/types/company";

interface AnalyticsDashboardProps {
  data: CompanyAnalytics;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const maxFollowers = Math.max(...data.followerGrowth.map((d) => d.count));
  const maxApps = Math.max(...data.applicationsVsHires.map((d) => d.applications));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Company Analytics</h1>
        <p className="text-sm text-slate-500">Recruitment & engagement insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Follower Growth */}
        <ChartCard title="Follower Growth" subtitle="Last 8 weeks">
          <div className="flex h-40 items-end gap-1.5">
            {data.followerGrowth.map((point) => (
              <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#3B5998] transition-all"
                  style={{ height: `${(point.count / maxFollowers) * 100}%`, minHeight: 4 }}
                  title={`${point.count} followers`}
                />
                <span className="text-[8px] text-slate-400">{point.date.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Applications vs Hires */}
        <ChartCard title="Applications vs Hires" subtitle="Monthly">
          <div className="flex h-40 items-end gap-3">
            {data.applicationsVsHires.map((point) => (
              <div key={point.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full gap-0.5" style={{ height: 120 }}>
                  <div
                    className="flex-1 self-end rounded-t bg-[#3B5998]/70"
                    style={{ height: `${(point.applications / maxApps) * 100}%`, minHeight: 2 }}
                    title={`${point.applications} applications`}
                  />
                  <div
                    className="flex-1 self-end rounded-t bg-emerald-500"
                    style={{ height: `${(point.hires / maxApps) * 100}%`, minHeight: 2 }}
                    title={`${point.hires} hires`}
                  />
                </div>
                <span className="text-[8px] text-slate-400">{point.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#3B5998]/70" /> Applications</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" /> Hires</span>
          </div>
        </ChartCard>
      </div>

      {/* Job Performance Table */}
      <ChartCard title="Job Post Performance" subtitle="Impressions, clicks & conversion">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="pb-2 font-medium">Job Title</th>
                <th className="pb-2 font-medium">Impressions</th>
                <th className="pb-2 font-medium">Clicks</th>
                <th className="pb-2 font-medium">Applications</th>
                <th className="pb-2 font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {data.jobPerformance.map((job) => (
                <tr key={job.jobTitle} className="border-b border-slate-50">
                  <td className="py-3 font-medium text-[#0F172A]">{job.jobTitle}</td>
                  <td className="py-3 text-slate-600">{job.impressions.toLocaleString()}</td>
                  <td className="py-3 text-slate-600">{job.clicks.toLocaleString()}</td>
                  <td className="py-3 text-slate-600">{job.applications}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-[#3B5998]/10 px-2 py-0.5 text-xs font-semibold text-[#3B5998]">
                      {job.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Score Distribution */}
      <ChartCard title="Applicant Quality" subtitle="Professional Score distribution">
        <div className="flex h-32 items-end gap-4">
          {data.scoreDistribution.map((bucket) => {
            const max = Math.max(...data.scoreDistribution.map((b) => b.count));
            return (
              <div key={bucket.range} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-[#0F172A]">{bucket.count}</span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#3B5998] to-[#93C5FD]"
                  style={{ height: `${(bucket.count / max) * 100}%`, minHeight: 8 }}
                />
                <span className="text-[10px] text-slate-400">{bucket.range}</span>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-[#0F172A]">{title}</h3>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
