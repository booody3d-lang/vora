import "server-only";

import { readJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  getAdminCompanyOverviewFromSupabase,
  listAllCompaniesFromSupabase,
  listCompaniesForAdminFromSupabase,
  listJobsForAdminFromSupabase,
  type AdminCompanyOverview,
} from "@/lib/admin/admin-companies-supabase";
import {
  ADMIN_JOB_POSTINGS,
  ADMIN_MODERATION_COMPANIES,
  ADMIN_PLATFORM_OVERVIEW,
} from "@/lib/admin/mock-data";
import { DEMO_COMPANY, DEMO_SUBSCRIPTION } from "@/lib/company/mock-data";
import type { CompanyProfile, CompanySubscription, JobPosting } from "@/types/company";
import type { AdminJobPosting, ModerationCompany } from "@/types/admin";

const JOBS_FILE = "company-jobs.json";
const COMPANY_FILE = "company-data.json";

interface CompanyJobsFile {
  byCompany: Record<string, JobPosting[]>;
}

interface CompanyDataFile {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
  subscriptions: Record<string, CompanySubscription>;
}

let adminCompaniesTableProbed = false;
let adminCompaniesTableAvailable = false;

async function isAdminCompaniesSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (adminCompaniesTableProbed) return adminCompaniesTableAvailable;

  adminCompaniesTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("companies").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("companies missing", error);
      }
      adminCompaniesTableAvailable = false;
      return false;
    }
    adminCompaniesTableAvailable = true;
    return true;
  } catch {
    adminCompaniesTableAvailable = false;
    return false;
  }
}

function readCompanyData(): CompanyDataFile {
  const data = readJsonStore(COMPANY_FILE, () => ({
    companies: {} as CompanyDataFile["companies"],
    accountLinks: {} as Record<string, string>,
    subscriptions: {} as Record<string, CompanySubscription>,
  }));
  if (!data.companies) data.companies = {};
  if (!data.subscriptions) data.subscriptions = {};
  return data;
}

function readJobsData(): CompanyJobsFile {
  const data = readJsonStore(JOBS_FILE, () => ({
    byCompany: {} as Record<string, JobPosting[]>,
  }));
  if (!data.byCompany) data.byCompany = {};
  return data;
}

function mergeCompanyFromJson(
  slug: string,
  data: CompanyDataFile
): CompanyProfile | null {
  const stored = data.companies[slug];
  if (!stored) return null;

  return {
    id: stored.id ?? slug,
    slug,
    name: stored.name ?? slug,
    tagline: stored.tagline ?? "",
    logoUrl: stored.logoUrl ?? "",
    coverImageUrl: stored.coverImageUrl ?? "",
    about: stored.about ?? "",
    industry: stored.industry ?? "",
    sizeRange: stored.sizeRange ?? "",
    headquarters: stored.headquarters ?? "",
    websiteUrl: stored.websiteUrl ?? "",
    isVerified: stored.isVerified ?? false,
    employeeCount: stored.employeeCount ?? 0,
    followerCount: stored.followerCount ?? 0,
    branches: stored.branches ?? [],
    announcement: stored.announcement,
    ...stored,
  } as CompanyProfile;
}

function listAllCompaniesFromJson(): CompanyProfile[] {
  const data = readCompanyData();
  const companies: CompanyProfile[] = [];
  const seen = new Set<string>();

  for (const slug of Object.keys(data.companies)) {
    const company = mergeCompanyFromJson(slug, data);
    if (!company || seen.has(company.slug)) continue;
    seen.add(company.slug);
    companies.push(company);
  }

  if (!seen.has(DEMO_COMPANY.slug)) {
    companies.push(DEMO_COMPANY);
  }

  return companies;
}

function getSubscriptionForCompanyFromJson(
  companyId: string,
  data: CompanyDataFile
): CompanySubscription {
  for (const [accountId, slug] of Object.entries(data.accountLinks)) {
    const company = mergeCompanyFromJson(slug, data);
    if (company?.id === companyId) {
      return data.subscriptions[accountId] ?? DEMO_SUBSCRIPTION;
    }
  }
  if (companyId === DEMO_COMPANY.id) return DEMO_SUBSCRIPTION;
  return DEMO_SUBSCRIPTION;
}

function buildJsonModerationCompanies(): ModerationCompany[] {
  const data = readCompanyData();
  const jobsData = readJobsData();
  const companies = listAllCompaniesFromJson();

  return companies.map((company) => {
    const jobs = jobsData.byCompany[company.id] ?? [];
    const subscription = getSubscriptionForCompanyFromJson(company.id, data);

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      activeJobs: jobs.filter((job) => job.status === "active").length,
      subscriptionStatus: subscription.status,
      licenseVerified: company.isVerified,
      reportCount: 0,
    };
  });
}

function mapJobStatusForAdmin(status: JobPosting["status"]): AdminJobPosting["status"] {
  if (status === "active") return "active";
  if (status === "archived") return "expired";
  return "paused";
}

function buildJsonAdminJobs(): AdminJobPosting[] {
  const jobsData = readJobsData();
  const companies = listAllCompaniesFromJson();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const postings: AdminJobPosting[] = [];

  for (const [companyId, jobs] of Object.entries(jobsData.byCompany)) {
    const company = companyById.get(companyId);
    for (const job of jobs) {
      postings.push({
        id: job.id,
        title: job.title,
        companyName: company?.name ?? "Company",
        companySlug: company?.slug ?? "",
        location: job.location,
        status: mapJobStatusForAdmin(job.status),
        applicationCount: job.applicationCount ?? 0,
        postedAt: job.createdAt,
        requireVideoPitch: job.requireVideoPitch,
      });
    }
  }

  return postings.sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

function buildJsonOverview(companies: ModerationCompany[], jobs: AdminJobPosting[]): AdminCompanyOverview {
  return {
    totalCompanies: companies.length,
    activeJobVacancies: jobs.filter((job) => job.status === "active").length,
    pendingVerification: companies.filter((company) => !company.licenseVerified).length,
    expiredSubscriptions: companies.filter((company) => company.subscriptionStatus === "expired")
      .length,
  };
}

function buildDemoOverview(): AdminCompanyOverview {
  return {
    totalCompanies: ADMIN_PLATFORM_OVERVIEW.totalCompanies.value,
    activeJobVacancies: ADMIN_PLATFORM_OVERVIEW.activeJobVacancies.value,
    pendingVerification: ADMIN_MODERATION_COMPANIES.filter((company) => !company.licenseVerified)
      .length,
    expiredSubscriptions: ADMIN_MODERATION_COMPANIES.filter(
      (company) => company.subscriptionStatus === "expired"
    ).length,
  };
}

export async function listAllCompanies(): Promise<CompanyProfile[]> {
  const jsonFallback = listAllCompaniesFromJson();

  if (!(await isAdminCompaniesSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listAllCompanies",
    () => listAllCompaniesFromSupabase(),
    jsonFallback
  );
}

export async function getAdminCompanyOverview(): Promise<AdminCompanyOverview> {
  const jsonCompanies = buildJsonModerationCompanies();
  const jsonJobs = buildJsonAdminJobs();
  const jsonFallback = buildJsonOverview(jsonCompanies, jsonJobs);
  const demoFallback = buildDemoOverview();

  if (!(await isAdminCompaniesSupabaseReady())) {
    return jsonCompanies.length > 0 || jsonJobs.length > 0 ? jsonFallback : demoFallback;
  }

  return runOptionalDbSync(
    "getAdminCompanyOverview",
    () => getAdminCompanyOverviewFromSupabase(),
    jsonCompanies.length > 0 || jsonJobs.length > 0 ? jsonFallback : demoFallback
  );
}

export async function listCompaniesForAdmin(): Promise<ModerationCompany[]> {
  const jsonFallback = buildJsonModerationCompanies();
  const demoFallback = ADMIN_MODERATION_COMPANIES;

  if (!(await isAdminCompaniesSupabaseReady())) {
    return jsonFallback.length > 0 ? jsonFallback : demoFallback;
  }

  return runOptionalDbSync(
    "listCompaniesForAdmin",
    () => listCompaniesForAdminFromSupabase(),
    jsonFallback.length > 0 ? jsonFallback : demoFallback
  );
}

export async function listJobsForAdmin(): Promise<AdminJobPosting[]> {
  const jsonFallback = buildJsonAdminJobs();
  const demoFallback = ADMIN_JOB_POSTINGS;

  if (!(await isAdminCompaniesSupabaseReady())) {
    return jsonFallback.length > 0 ? jsonFallback : demoFallback;
  }

  return runOptionalDbSync(
    "listJobsForAdmin",
    () => listJobsForAdminFromSupabase(),
    jsonFallback.length > 0 ? jsonFallback : demoFallback
  );
}

export function isAdminCompaniesPersistenceActive(): boolean {
  return adminCompaniesTableAvailable;
}
