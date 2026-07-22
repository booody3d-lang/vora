import "server-only";

import { getCompanyByAccountId } from "@/lib/company/company-store";
import { listJobsForCompany, isJobsSupabaseReady } from "@/lib/company/jobs-store";
import { getFollowerCount } from "@/lib/network/social-store";
import {
  computeAnalyticsFromSupabase,
  isAnalyticsEmpty,
} from "@/lib/company/analytics-supabase";
import { DEMO_ANALYTICS } from "@/lib/company/mock-data";
import { readJsonStore } from "@/lib/storage/json-store";
import { runOptionalDbSync } from "@/lib/supabase/safe-db";
import type { CompanyAnalytics, JobPosting } from "@/types/company";

export type AnalyticsSource = "supabase" | "json" | "demo";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWeekLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function buildFollowerGrowthFromTotal(currentTotal: number): CompanyAnalytics["followerGrowth"] {
  const points: CompanyAnalytics["followerGrowth"] = [];
  const now = new Date();

  for (let weekOffset = 7; weekOffset >= 0; weekOffset -= 1) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - weekOffset * 7);
    points.push({
      date: formatWeekLabel(weekEnd),
      count: Math.round((currentTotal * (8 - weekOffset)) / 8),
    });
  }

  return points;
}

function buildApplicationsVsHiresFromRows(
  applications: Array<{ created_at: string; ats_stage: string }>
): CompanyAnalytics["applicationsVsHires"] {
  const now = new Date();
  const buckets = new Map<string, { applications: number; hires: number }>();

  for (let i = 4; i >= 0; i -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = MONTH_LABELS[monthDate.getMonth()];
    buckets.set(label, { applications: 0, hires: 0 });
  }

  for (const application of applications) {
    const label = MONTH_LABELS[new Date(application.created_at).getMonth()];
    const bucket = buckets.get(label);
    if (!bucket) continue;
    bucket.applications += 1;
    if (application.ats_stage === "hired") bucket.hires += 1;
  }

  return Array.from(buckets.entries()).map(([month, values]) => ({
    month,
    applications: values.applications,
    hires: values.hires,
  }));
}

function buildScoreDistributionFromRows(
  applications: Array<{ professional_score_at_apply: number }>
): CompanyAnalytics["scoreDistribution"] {
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

async function loadJsonApplicationsForJobs(jobs: JobPosting[]) {
  const appData = readJsonStore("company-applications.json", () => ({
    byJob: {} as Record<
      string,
      Array<{
        stage: string;
        professionalScore: number;
        appliedAt: string;
      }>
    >,
    notes: {},
  }));

  const applications: Array<{
    created_at: string;
    ats_stage: string;
    professional_score_at_apply: number;
    job_id: string;
  }> = [];

  for (const job of jobs) {
    const applicants = appData.byJob[job.id] ?? [];
    for (const applicant of applicants) {
      applications.push({
        created_at: applicant.appliedAt,
        ats_stage: applicant.stage,
        professional_score_at_apply: applicant.professionalScore,
        job_id: job.id,
      });
    }
  }

  return applications;
}

async function computeAnalyticsFromLocalStores(
  companyId: string,
  jobs: JobPosting[],
  followerTotal: number
): Promise<CompanyAnalytics> {
  void companyId;

  const applications = await loadJsonApplicationsForJobs(jobs);
  const applicationCounts = new Map<string, number>();

  for (const application of applications) {
    applicationCounts.set(
      application.job_id,
      (applicationCounts.get(application.job_id) ?? 0) + 1
    );
  }

  return {
    followerGrowth: buildFollowerGrowthFromTotal(followerTotal),
    applicationsVsHires: buildApplicationsVsHiresFromRows(applications),
    jobPerformance: jobs.map((job) => {
      const appCount = applicationCounts.get(job.id) ?? job.applicationCount ?? 0;
      const clicks = job.clicks ?? 0;
      return {
        jobTitle: job.title,
        impressions: job.impressions ?? 0,
        clicks,
        applications: appCount,
        conversionRate: clicks > 0 ? Math.round((appCount / clicks) * 1000) / 10 : 0,
      };
    }),
    scoreDistribution: buildScoreDistributionFromRows(applications),
  };
}

function resolveAnalyticsResult(
  liveAnalytics: CompanyAnalytics,
  jsonAnalytics: CompanyAnalytics,
  liveSource: AnalyticsSource
): { analytics: CompanyAnalytics; source: AnalyticsSource } {
  if (!isAnalyticsEmpty(liveAnalytics)) {
    return { analytics: liveAnalytics, source: liveSource };
  }

  if (!isAnalyticsEmpty(jsonAnalytics)) {
    return { analytics: jsonAnalytics, source: "json" };
  }

  return { analytics: DEMO_ANALYTICS, source: "demo" };
}

export async function getAnalyticsForAccount(
  accountId: string
): Promise<{ analytics: CompanyAnalytics; source: AnalyticsSource }> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) {
    return { analytics: DEMO_ANALYTICS, source: "demo" };
  }

  const jobs = await listJobsForCompany(company.id);
  const followerTotal = await getFollowerCount(company.id, "company");
  const jsonAnalytics = await computeAnalyticsFromLocalStores(company.id, jobs, followerTotal);

  if (!(await isJobsSupabaseReady())) {
    return resolveAnalyticsResult(jsonAnalytics, jsonAnalytics, "json");
  }

  const liveAnalytics = await runOptionalDbSync(
    "getAnalyticsForAccount",
    () => computeAnalyticsFromSupabase(company.id),
    jsonAnalytics
  );

  return resolveAnalyticsResult(liveAnalytics, jsonAnalytics, "supabase");
}

export async function getAnalyticsForCompany(
  companyId: string
): Promise<{ analytics: CompanyAnalytics; source: AnalyticsSource }> {
  const jobs = await listJobsForCompany(companyId);
  const followerTotal = await getFollowerCount(companyId, "company");
  const jsonAnalytics = await computeAnalyticsFromLocalStores(companyId, jobs, followerTotal);

  if (!(await isJobsSupabaseReady())) {
    return resolveAnalyticsResult(jsonAnalytics, jsonAnalytics, "json");
  }

  const liveAnalytics = await runOptionalDbSync(
    "getAnalyticsForCompany",
    () => computeAnalyticsFromSupabase(companyId),
    jsonAnalytics
  );

  return resolveAnalyticsResult(liveAnalytics, jsonAnalytics, "supabase");
}
