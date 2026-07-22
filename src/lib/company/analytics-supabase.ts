import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyAnalytics } from "@/types/company";

interface ApplicationRow {
  created_at: string;
  ats_stage: string;
  professional_score_at_apply: number;
  job_id: string;
}

interface JobRow {
  id: string;
  title: string;
  impressions: number;
  clicks: number;
}

interface FollowerRow {
  created_at: string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWeekLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function buildFollowerGrowth(rows: FollowerRow[], currentTotal: number): CompanyAnalytics["followerGrowth"] {
  const points: CompanyAnalytics["followerGrowth"] = [];
  const now = new Date();

  for (let weekOffset = 7; weekOffset >= 0; weekOffset -= 1) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - weekOffset * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const count =
      rows.length > 0
        ? rows.filter((row) => new Date(row.created_at) <= weekEnd).length
        : Math.round((currentTotal * (8 - weekOffset)) / 8);

    points.push({
      date: formatWeekLabel(weekEnd),
      count,
    });
  }

  return points;
}

function buildApplicationsVsHires(applications: ApplicationRow[]): CompanyAnalytics["applicationsVsHires"] {
  const now = new Date();
  const buckets = new Map<string, { applications: number; hires: number }>();

  for (let i = 4; i >= 0; i -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = MONTH_LABELS[monthDate.getMonth()];
    buckets.set(label, { applications: 0, hires: 0 });
  }

  for (const application of applications) {
    const created = new Date(application.created_at);
    const label = MONTH_LABELS[created.getMonth()];
    const bucket = buckets.get(label);
    if (!bucket) continue;
    bucket.applications += 1;
    if (application.ats_stage === "hired") {
      bucket.hires += 1;
    }
  }

  return Array.from(buckets.entries()).map(([month, values]) => ({
    month,
    applications: values.applications,
    hires: values.hires,
  }));
}

function buildJobPerformance(
  jobs: JobRow[],
  applicationCounts: Map<string, number>
): CompanyAnalytics["jobPerformance"] {
  return jobs.map((job) => {
    const applications = applicationCounts.get(job.id) ?? 0;
    const conversionRate =
      job.clicks > 0 ? Math.round((applications / job.clicks) * 1000) / 10 : 0;

    return {
      jobTitle: job.title,
      impressions: job.impressions ?? 0,
      clicks: job.clicks ?? 0,
      applications,
      conversionRate,
    };
  });
}

function buildScoreDistribution(applications: ApplicationRow[]): CompanyAnalytics["scoreDistribution"] {
  const buckets = [
    { range: "0-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];

  for (const application of applications) {
    const score = application.professional_score_at_apply;
    if (score <= 40) buckets[0].count += 1;
    else if (score <= 60) buckets[1].count += 1;
    else if (score <= 80) buckets[2].count += 1;
    else buckets[3].count += 1;
  }

  return buckets;
}

export async function computeAnalyticsFromSupabase(companyId: string): Promise<CompanyAnalytics> {
  const admin = createAdminClient();

  const [{ data: jobs, error: jobsError }, { data: followers, error: followersError }] =
    await Promise.all([
      admin.from("jobs").select("id, title, impressions, clicks").eq("company_id", companyId),
      admin.from("company_followers").select("created_at").eq("company_id", companyId),
    ]);

  if (jobsError) throw jobsError;
  if (followersError) throw followersError;

  const jobRows = (jobs ?? []) as JobRow[];
  const jobIds = jobRows.map((job) => job.id);

  let applications: ApplicationRow[] = [];
  if (jobIds.length > 0) {
    const { data, error } = await admin
      .from("job_applications")
      .select("created_at, ats_stage, professional_score_at_apply, job_id")
      .in("job_id", jobIds);

    if (error) throw error;
    applications = (data ?? []) as ApplicationRow[];
  }

  const applicationCounts = new Map<string, number>();
  for (const application of applications) {
    applicationCounts.set(
      application.job_id,
      (applicationCounts.get(application.job_id) ?? 0) + 1
    );
  }

  const followerRows = (followers ?? []) as FollowerRow[];

  return {
    followerGrowth: buildFollowerGrowth(followerRows, followerRows.length),
    applicationsVsHires: buildApplicationsVsHires(applications),
    jobPerformance: buildJobPerformance(jobRows, applicationCounts),
    scoreDistribution: buildScoreDistribution(applications),
  };
}

export function isAnalyticsEmpty(analytics: CompanyAnalytics): boolean {
  const hasFollowers = analytics.followerGrowth.some((point) => point.count > 0);
  const hasApplications = analytics.applicationsVsHires.some(
    (point) => point.applications > 0 || point.hires > 0
  );
  const hasJobs = analytics.jobPerformance.length > 0;
  const hasScores = analytics.scoreDistribution.some((bucket) => bucket.count > 0);
  return !hasFollowers && !hasApplications && !hasJobs && !hasScores;
}
