import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import type { JobPosting, JobPostingForm, WorkLocation, EmploymentType } from "@/types/company";

interface DbJobRow {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  description: string;
  location: string | null;
  employment_type: string | null;
  status: JobPosting["status"];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  work_location: WorkLocation | null;
  salary_min: number | null;
  salary_max: number | null;
  show_salary: boolean;
  required_skills: string[] | null;
  require_video_pitch: boolean;
  impressions: number;
  clicks: number;
}

export function mapJobRow(row: DbJobRow, applicationCount = 0): JobPosting {
  return {
    id: row.id,
    slug: row.slug,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    location: row.location ?? "",
    workLocation: row.work_location ?? "hybrid",
    employmentType: (row.employment_type as EmploymentType) ?? "full_time",
    salaryMin: row.salary_min != null ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : undefined,
    showSalary: row.show_salary,
    requiredSkills: row.required_skills ?? [],
    requireVideoPitch: row.require_video_pitch,
    status: row.status,
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    applicationCount,
    createdAt: row.created_at,
  };
}

function mapJobFormToInsertRow(
  companyId: string,
  slug: string,
  form: JobPostingForm,
  status: JobPosting["status"]
): Record<string, unknown> {
  return {
    company_id: companyId,
    slug,
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim() || null,
    employment_type: form.employmentType,
    work_location: form.workLocation,
    salary_min: form.salaryMin ?? null,
    salary_max: form.salaryMax ?? null,
    show_salary: form.showSalary,
    required_skills: form.requiredSkills,
    require_video_pitch: form.requireVideoPitch,
    status,
    is_public: true,
    impressions: 0,
    clicks: 0,
  };
}

function mapJobUpdatesToRow(updates: Partial<JobPosting>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.location !== undefined) row.location = updates.location || null;
  if (updates.workLocation !== undefined) row.work_location = updates.workLocation;
  if (updates.employmentType !== undefined) row.employment_type = updates.employmentType;
  if (updates.salaryMin !== undefined) row.salary_min = updates.salaryMin ?? null;
  if (updates.salaryMax !== undefined) row.salary_max = updates.salaryMax ?? null;
  if (updates.showSalary !== undefined) row.show_salary = updates.showSalary;
  if (updates.requiredSkills !== undefined) row.required_skills = updates.requiredSkills;
  if (updates.requireVideoPitch !== undefined) row.require_video_pitch = updates.requireVideoPitch;
  if (updates.status !== undefined) row.status = updates.status;

  return row;
}

async function listExistingJobSlugs(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("jobs").select("slug");
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug as string));
}

export async function generateUniqueJobSlug(title: string, extraSlugs?: Set<string>): Promise<string> {
  const base = slugifyName(title) || `job-${Date.now().toString(36)}`;
  const existing = await listExistingJobSlugs();
  if (extraSlugs) {
    for (const slug of extraSlugs) existing.add(slug);
  }
  return uniqueSlug(base, existing);
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

export async function listJobsByCompanyFromSupabase(companyId: string): Promise<JobPosting[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as DbJobRow[];
  const counts = await getApplicationCounts(rows.map((row) => row.id));
  return rows.map((row) => mapJobRow(row, counts[row.id] ?? 0));
}

export async function getJobByIdFromSupabase(
  jobId: string,
  companyId?: string
): Promise<JobPosting | null> {
  const admin = createAdminClient();
  let query = admin.from("jobs").select("*").eq("id", jobId);
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as DbJobRow;
  const counts = await getApplicationCounts([row.id]);
  return mapJobRow(row, counts[row.id] ?? 0);
}

export async function createJobInSupabase(
  companyId: string,
  form: JobPostingForm,
  status: JobPosting["status"],
  slug: string
): Promise<JobPosting> {
  const admin = createAdminClient();
  const row = mapJobFormToInsertRow(companyId, slug, form, status);

  const { data, error } = await admin.from("jobs").insert(row).select("*").single();
  if (error) throw error;

  return mapJobRow(data as DbJobRow, 0);
}

export async function updateJobInSupabase(
  jobId: string,
  companyId: string,
  updates: Partial<JobPosting>
): Promise<JobPosting | null> {
  const admin = createAdminClient();
  const patch = mapJobUpdatesToRow(updates);

  const { data, error } = await admin
    .from("jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbJobRow;
  const counts = await getApplicationCounts([row.id]);
  return mapJobRow(row, counts[row.id] ?? 0);
}

export async function listActivePublicJobsFromSupabase(): Promise<
  Array<JobPosting & { companyName: string; companySlug: string }>
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*, companies(name, slug)")
    .eq("status", "active")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const job = mapJobRow(row as DbJobRow, 0);
    const company = row.companies as { name: string; slug: string } | null;
    return {
      ...job,
      companyName: company?.name ?? "Company",
      companySlug: company?.slug ?? "",
    };
  });
}
