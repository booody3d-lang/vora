import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  getCompanyByAccountId,
  getCompanyById,
  incrementJobsPublishedCountForAccount,
} from "@/lib/company/company-store";
import {
  createJobInSupabase,
  generateUniqueJobSlug,
  getJobByIdFromSupabase,
  listActivePublicJobsFromSupabase,
  listJobsByCompanyFromSupabase,
  updateJobInSupabase,
} from "@/lib/company/jobs-supabase";
import type { JobPosting, JobPostingForm } from "@/types/company";
import type { PublicJobListing } from "@/lib/jobs/listings";

const DATA_FILE = "company-jobs.json";

interface CompanyJobsFile {
  byCompany: Record<string, JobPosting[]>;
}

let jobsTableProbed = false;
let jobsTableAvailable = false;

export async function isJobsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (jobsTableProbed) return jobsTableAvailable;

  jobsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("jobs").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("jobs missing", error);
      }
      jobsTableAvailable = false;
      return false;
    }
    jobsTableAvailable = true;
    return true;
  } catch {
    jobsTableAvailable = false;
    return false;
  }
}

function readJobsData(): CompanyJobsFile {
  const data = readJsonStore(DATA_FILE, () => ({
    byCompany: {} as Record<string, JobPosting[]>,
  }));
  if (!data.byCompany) data.byCompany = {};
  return data;
}

function writeJobsData(data: CompanyJobsFile) {
  writeJsonStore(DATA_FILE, data);
}

function listJobsFromJson(companyId: string): JobPosting[] {
  return readJobsData().byCompany[companyId] ?? [];
}

function getJobFromJson(companyId: string, jobId: string): JobPosting | null {
  return listJobsFromJson(companyId).find((job) => job.id === jobId) ?? null;
}

function collectJsonSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const jobs of Object.values(readJobsData().byCompany)) {
    for (const job of jobs) slugs.add(job.slug);
  }
  return slugs;
}

function saveJobToJson(companyId: string, job: JobPosting) {
  const data = readJobsData();
  const jobs = data.byCompany[companyId] ?? [];
  const index = jobs.findIndex((entry) => entry.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  data.byCompany[companyId] = jobs;
  writeJobsData(data);
}

function buildJsonJob(
  companyId: string,
  slug: string,
  form: JobPostingForm,
  status: JobPosting["status"]
): JobPosting {
  return {
    id: `job-${Date.now().toString(36)}`,
    slug,
    companyId,
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    workLocation: form.workLocation,
    employmentType: form.employmentType,
    salaryMin: form.salaryMin,
    salaryMax: form.salaryMax,
    showSalary: form.showSalary,
    requiredSkills: form.requiredSkills,
    requireVideoPitch: form.requireVideoPitch,
    status,
    impressions: 0,
    clicks: 0,
    applicationCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function listJobsForCompany(companyId: string): Promise<JobPosting[]> {
  const jsonFallback = listJobsFromJson(companyId);

  if (!(await isJobsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listJobsForCompany",
    () => listJobsByCompanyFromSupabase(companyId),
    jsonFallback
  );
}

export async function listJobsForAccount(accountId: string): Promise<JobPosting[]> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return [];
  return listJobsForCompany(company.id);
}

export async function getJobByIdForAccount(
  accountId: string,
  jobId: string
): Promise<JobPosting | null> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return null;

  const jsonFallback = getJobFromJson(company.id, jobId);

  if (!(await isJobsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getJobByIdForAccount",
    () => getJobByIdFromSupabase(jobId, company.id),
    jsonFallback
  );
}

export async function getJobById(jobId: string): Promise<JobPosting | null> {
  for (const jobs of Object.values(readJobsData().byCompany)) {
    const match = jobs.find((job) => job.id === jobId);
    if (match) return match;
  }

  if (!(await isJobsSupabaseReady())) {
    return null;
  }

  return runOptionalDbSync(
    "getJobById",
    () => getJobByIdFromSupabase(jobId),
    null
  );
}

export async function listActiveJobsForCompany(companyId: string): Promise<JobPosting[]> {
  const jobs = await listJobsForCompany(companyId);
  return jobs.filter((job) => job.status === "active");
}

export async function createJobForAccount(
  accountId: string,
  form: JobPostingForm,
  status: JobPosting["status"] = "active"
): Promise<JobPosting> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) {
    throw new Error("Company not found");
  }

  const slug = await generateUniqueJobSlug(form.title, collectJsonSlugs());
  const jsonJob = buildJsonJob(company.id, slug, form, status);
  saveJobToJson(company.id, jsonJob);

  let created = jsonJob;

  if (await isJobsSupabaseReady()) {
    created = await runOptionalDbSync(
      "createJobForAccount",
      () => createJobInSupabase(company.id, form, status, slug),
      jsonJob
    );

    if (created.id !== jsonJob.id) {
      const data = readJobsData();
      const jobs = data.byCompany[company.id] ?? [];
      const index = jobs.findIndex((job) => job.id === jsonJob.id);
      if (index >= 0) {
        jobs[index] = created;
        data.byCompany[company.id] = jobs;
        writeJobsData(data);
      }
    }
  }

  if (status === "active") {
    await incrementJobsPublishedCountForAccount(accountId);
  }

  return created;
}

export async function updateJobForAccount(
  accountId: string,
  jobId: string,
  updates: Partial<JobPosting>
): Promise<JobPosting | null> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return null;

  const existing = getJobFromJson(company.id, jobId);
  if (!existing) return null;

  const updated: JobPosting = { ...existing, ...updates };
  saveJobToJson(company.id, updated);

  if (!(await isJobsSupabaseReady())) {
    return updated;
  }

  return runOptionalDbSync(
    "updateJobForAccount",
    () => updateJobInSupabase(jobId, company.id, updates),
    updated
  );
}

async function buildJsonPublicListings(): Promise<PublicJobListing[]> {
  const listings: PublicJobListing[] = [];
  const data = readJobsData();

  for (const [companyId, jobs] of Object.entries(data.byCompany)) {
    const company = await getCompanyById(companyId);
    for (const job of jobs.filter((entry) => entry.status === "active")) {
      listings.push({
        id: job.id,
        slug: job.slug,
        title: job.title,
        company: company?.name ?? "Company",
        companySlug: company?.slug ?? "",
        location: job.location,
        employmentType: job.employmentType,
        description: job.description,
      });
    }
  }

  return listings;
}

export async function listActivePublicJobListings(): Promise<PublicJobListing[]> {
  const jsonFallback = await buildJsonPublicListings();

  if (!(await isJobsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listActivePublicJobListings",
    async () => {
      const rows = await listActivePublicJobsFromSupabase();
      return rows.map(({ companyName, companySlug, description, ...job }) => ({
        id: job.id,
        slug: job.slug,
        title: job.title,
        company: companyName,
        companySlug: companySlug,
        location: job.location,
        employmentType: job.employmentType,
        description,
      }));
    },
    jsonFallback
  );
}
