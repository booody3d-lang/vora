import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapCompanyRow } from "@/lib/company/company-supabase";
import { mapJobRow } from "@/lib/company/jobs-supabase";
import type { CompanyProfile } from "@/types/company";
import type { AdminJobPosting, ModerationCompany } from "@/types/admin";
import type { JobPosting } from "@/types/company";

function mapJobStatusForAdmin(status: JobPosting["status"]): AdminJobPosting["status"] {
  if (status === "active") return "active";
  if (status === "archived") return "expired";
  return "paused";
}

export interface AdminCompanyOverview {
  totalCompanies: number;
  activeJobVacancies: number;
  pendingVerification: number;
  expiredSubscriptions: number;
}

async function getApplicationCounts(jobIds: string[]): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {};

  const admin = createAdminClient();
  const { data, error } = await admin.from("job_applications").select("job_id").in("job_id", jobIds);
  if (error) return {};

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const jobId = row.job_id as string;
    counts[jobId] = (counts[jobId] ?? 0) + 1;
  }
  return counts;
}

export async function listAllCompaniesFromSupabase(): Promise<CompanyProfile[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapCompanyRow(row as Parameters<typeof mapCompanyRow>[0]));
}

export async function getAdminCompanyOverviewFromSupabase(): Promise<AdminCompanyOverview> {
  const admin = createAdminClient();

  const [companiesRes, activeJobsRes, subsRes] = await Promise.all([
    admin.from("companies").select("id, is_verified"),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("company_subscriptions").select("status"),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (activeJobsRes.error) throw activeJobsRes.error;
  if (subsRes.error) throw subsRes.error;

  const companies = companiesRes.data ?? [];
  const subs = subsRes.data ?? [];

  return {
    totalCompanies: companies.length,
    activeJobVacancies: activeJobsRes.count ?? 0,
    pendingVerification: companies.filter((row) => !row.is_verified).length,
    expiredSubscriptions: subs.filter((row) => row.status === "expired").length,
  };
}

export async function listCompaniesForAdminFromSupabase(): Promise<ModerationCompany[]> {
  const admin = createAdminClient();

  const [companiesRes, subsRes, jobsRes] = await Promise.all([
    admin.from("companies").select("*").order("name"),
    admin.from("company_subscriptions").select("company_id, status"),
    admin.from("jobs").select("company_id, status"),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (subsRes.error) throw subsRes.error;
  if (jobsRes.error) throw jobsRes.error;

  const subsByCompany = new Map<string, string>();
  for (const row of subsRes.data ?? []) {
    subsByCompany.set(row.company_id as string, row.status as string);
  }

  const activeJobsByCompany = new Map<string, number>();
  for (const row of jobsRes.data ?? []) {
    if (row.status !== "active") continue;
    const companyId = row.company_id as string;
    activeJobsByCompany.set(companyId, (activeJobsByCompany.get(companyId) ?? 0) + 1);
  }

  return (companiesRes.data ?? []).map((row) => {
    const company = mapCompanyRow(row as Parameters<typeof mapCompanyRow>[0]);
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      activeJobs: activeJobsByCompany.get(company.id) ?? 0,
      subscriptionStatus: subsByCompany.get(company.id) ?? "trial",
      licenseVerified: company.isVerified,
      reportCount: 0,
    };
  });
}

export async function listJobsForAdminFromSupabase(): Promise<AdminJobPosting[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*, companies(name, slug)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const counts = await getApplicationCounts(rows.map((row) => row.id as string));

  return rows.map((row) => {
    const job = mapJobRow(row as Parameters<typeof mapJobRow>[0], counts[row.id as string] ?? 0);
    const company = row.companies as { name: string; slug: string } | null;
    return {
      id: job.id,
      title: job.title,
      companyName: company?.name ?? "Company",
      companySlug: company?.slug ?? "",
      location: job.location,
      status: mapJobStatusForAdmin(job.status),
      applicationCount: job.applicationCount ?? 0,
      postedAt: job.createdAt,
      requireVideoPitch: job.requireVideoPitch,
    };
  });
}
