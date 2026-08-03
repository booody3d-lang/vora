import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import { isMissingColumnError } from "@/lib/supabase/safe-db";
import type { CompanyBranch, CompanyProfile, CompanySubscription } from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR, FREE_JOBS_LIMIT } from "@/types/company";

/** Full migration schema row (supabase/migrations). */
interface DbCompanyRow {
  id: string;
  owner_account_id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  about?: string | null;
  industry?: string | null;
  size_range?: string | null;
  headquarters?: string | null;
  website_url?: string | null;
  is_verified?: boolean;
  employee_count?: number | null;
  follower_count?: number;
  branches?: CompanyBranch[] | null;
  announcement?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Production slim schema aliases */
  banner_url?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  size?: string | null;
}

interface DbSubscriptionRow {
  id: string;
  company_id: string;
  status?: CompanySubscription["status"] | string;
  trial_started_at?: string;
  trial_ends_at?: string;
  jobs_published_count?: number;
  free_jobs_limit?: number;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  annual_price_sar?: number;
  /** Production slim schema */
  plan_tier?: string;
  current_period_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompanyInput {
  name: string;
  tagline?: string;
  industry?: string;
  sizeRange?: string;
  headquarters?: string;
  websiteUrl?: string;
  about?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  branches?: CompanyBranch[];
  announcement?: string;
}

function parseBranches(value: unknown): CompanyBranch[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CompanyBranch =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as CompanyBranch).city === "string" &&
      typeof (item as CompanyBranch).country === "string"
  );
}

export function mapCompanyRow(row: DbCompanyRow): CompanyProfile {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? row.banner_url ?? undefined,
    about: row.about ?? row.bio ?? undefined,
    industry: row.industry ?? undefined,
    sizeRange: row.size_range ?? row.size ?? undefined,
    headquarters: row.headquarters ?? row.location ?? undefined,
    websiteUrl: row.website_url ?? row.website ?? undefined,
    isVerified: row.is_verified ?? false,
    employeeCount: row.employee_count ?? 0,
    followerCount: row.follower_count ?? 0,
    branches: parseBranches(row.branches),
    announcement: row.announcement ?? undefined,
  };
}

export function mapSubscriptionRow(row: DbSubscriptionRow): CompanySubscription {
  const createdAt = row.created_at ?? new Date().toISOString();
  const defaultTrialEnd = new Date(Date.parse(createdAt) + 90 * 24 * 60 * 60 * 1000).toISOString();

  if (row.plan_tier !== undefined || row.trial_started_at === undefined) {
    let status: CompanySubscription["status"] = "trial";
    if (row.status === "expired") status = "expired";
    else if (row.status === "active" && row.plan_tier && row.plan_tier !== "trial") status = "active";
    else if (row.plan_tier === "trial") status = "trial";

    return {
      status,
      trialStartedAt: createdAt,
      trialEndsAt: row.current_period_end ?? defaultTrialEnd,
      jobsPublishedCount: row.jobs_published_count ?? 0,
      freeJobsLimit: row.free_jobs_limit ?? FREE_JOBS_LIMIT,
      subscriptionExpiresAt: row.current_period_end ?? row.subscription_expires_at ?? undefined,
      annualPriceSar: Number(row.annual_price_sar ?? ANNUAL_SUBSCRIPTION_SAR),
    };
  }

  return {
    status: (row.status as CompanySubscription["status"]) ?? "trial",
    trialStartedAt: row.trial_started_at ?? createdAt,
    trialEndsAt: row.trial_ends_at ?? defaultTrialEnd,
    jobsPublishedCount: row.jobs_published_count ?? 0,
    freeJobsLimit: row.free_jobs_limit ?? FREE_JOBS_LIMIT,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    annualPriceSar: Number(row.annual_price_sar ?? ANNUAL_SUBSCRIPTION_SAR),
  };
}

function mapProfileToInsertRow(
  ownerAccountId: string,
  slug: string,
  input: CreateCompanyInput
): Record<string, unknown> {
  return {
    owner_account_id: ownerAccountId,
    slug,
    name: input.name.trim(),
    tagline: input.tagline?.trim() || null,
    logo_url: input.logoUrl ?? null,
    cover_image_url: input.coverImageUrl ?? null,
    about: input.about?.trim() || null,
    industry: input.industry?.trim() || null,
    size_range: input.sizeRange?.trim() || null,
    headquarters: input.headquarters?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    branches: input.branches ?? [],
    announcement: input.announcement?.trim() || null,
    is_verified: false,
    employee_count: 0,
    follower_count: 0,
  };
}

function mapProfileToProductionInsertRow(
  ownerAccountId: string,
  slug: string,
  input: CreateCompanyInput
): Record<string, unknown> {
  return {
    owner_account_id: ownerAccountId,
    slug,
    name: input.name.trim(),
    logo_url: input.logoUrl ?? null,
    banner_url: input.coverImageUrl ?? null,
    bio: input.about?.trim() || null,
    industry: input.industry?.trim() || null,
    size: input.sizeRange?.trim() || null,
    location: input.headquarters?.trim() || null,
    website: input.websiteUrl?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function mapProfileUpdatesToRow(updates: Partial<CompanyProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.tagline !== undefined) row.tagline = updates.tagline || null;
  if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl || null;
  if (updates.coverImageUrl !== undefined) row.cover_image_url = updates.coverImageUrl || null;
  if (updates.about !== undefined) row.about = updates.about || null;
  if (updates.industry !== undefined) row.industry = updates.industry || null;
  if (updates.sizeRange !== undefined) row.size_range = updates.sizeRange || null;
  if (updates.headquarters !== undefined) row.headquarters = updates.headquarters || null;
  if (updates.websiteUrl !== undefined) row.website_url = updates.websiteUrl || null;
  if (updates.isVerified !== undefined) row.is_verified = updates.isVerified;
  if (updates.employeeCount !== undefined) row.employee_count = updates.employeeCount;
  if (updates.followerCount !== undefined) row.follower_count = updates.followerCount;
  if (updates.branches !== undefined) row.branches = updates.branches;
  if (updates.announcement !== undefined) row.announcement = updates.announcement || null;

  return row;
}

function mapProfileUpdatesToProductionRow(
  updates: Partial<CompanyProfile>
): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl || null;
  if (updates.coverImageUrl !== undefined) row.banner_url = updates.coverImageUrl || null;
  if (updates.about !== undefined) row.bio = updates.about || null;
  if (updates.industry !== undefined) row.industry = updates.industry || null;
  if (updates.sizeRange !== undefined) row.size = updates.sizeRange || null;
  if (updates.headquarters !== undefined) row.location = updates.headquarters || null;
  if (updates.websiteUrl !== undefined) row.website = updates.websiteUrl || null;

  return row;
}

async function insertCompanyRow(
  ownerAccountId: string,
  slug: string,
  input: CreateCompanyInput
) {
  const admin = createAdminClient();
  const migrationRow = mapProfileToInsertRow(ownerAccountId, slug, input);
  const migration = await admin.from("companies").insert(migrationRow).select("*").single();
  if (!migration.error) return migration;

  if (!isMissingColumnError(migration.error)) throw migration.error;

  const productionRow = mapProfileToProductionInsertRow(ownerAccountId, slug, input);
  const production = await admin.from("companies").insert(productionRow).select("*").single();
  if (production.error) throw production.error;
  return production;
}

async function updateCompanyRow(
  companyId: string,
  ownerAccountId: string,
  updates: Partial<CompanyProfile>
) {
  const admin = createAdminClient();
  const migrationPatch = mapProfileUpdatesToRow(updates);
  const migration = await admin
    .from("companies")
    .update(migrationPatch)
    .eq("id", companyId)
    .eq("owner_account_id", ownerAccountId)
    .select("*")
    .single();

  if (!migration.error) return migration;

  if (!isMissingColumnError(migration.error)) throw migration.error;

  const productionPatch = mapProfileUpdatesToProductionRow(updates);
  const production = await admin
    .from("companies")
    .update(productionPatch)
    .eq("id", companyId)
    .eq("owner_account_id", ownerAccountId)
    .select("*")
    .single();

  if (production.error) throw production.error;
  return production;
}

async function listExistingSlugs(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("companies").select("slug");
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug as string));
}

export async function generateUniqueCompanySlug(name: string): Promise<string> {
  const base = slugifyName(name) || `company-${Date.now().toString(36)}`;
  const existing = await listExistingSlugs();
  return uniqueSlug(base, existing);
}

export async function getCompanyBySlugFromSupabase(
  slug: string
): Promise<CompanyProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCompanyRow(data as DbCompanyRow);
}

export async function getCompanyByOwnerFromSupabase(
  ownerAccountId: string
): Promise<CompanyProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("*")
    .eq("owner_account_id", ownerAccountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCompanyRow(data as DbCompanyRow);
}

export async function getCompanyByIdFromSupabase(
  companyId: string
): Promise<CompanyProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCompanyRow(data as DbCompanyRow);
}

export async function getCompanySubscriptionFromSupabase(
  companyId: string
): Promise<CompanySubscription | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSubscriptionRow(data as DbSubscriptionRow);
}

export async function createCompanyInSupabase(
  ownerAccountId: string,
  input: CreateCompanyInput
): Promise<{ company: CompanyProfile; subscription: CompanySubscription }> {
  const admin = createAdminClient();
  const slug = await generateUniqueCompanySlug(input.name);
  const { data: company, error } = await insertCompanyRow(ownerAccountId, slug, input);
  if (error || !company) throw error ?? new Error("Company insert failed");

  let subscription = await getCompanySubscriptionFromSupabase(company.id);
  if (!subscription) {
    const migrationInsert = await admin
      .from("company_subscriptions")
      .insert({
        company_id: company.id,
        status: "trial",
        free_jobs_limit: FREE_JOBS_LIMIT,
        annual_price_sar: ANNUAL_SUBSCRIPTION_SAR,
      })
      .select("*")
      .single();

    if (!migrationInsert.error && migrationInsert.data) {
      subscription = mapSubscriptionRow(migrationInsert.data as DbSubscriptionRow);
    } else if (isMissingColumnError(migrationInsert.error)) {
      const productionInsert = await admin
        .from("company_subscriptions")
        .insert({
          company_id: company.id,
          plan_tier: "trial",
          status: "active",
        })
        .select("*")
        .single();
      if (productionInsert.error) throw productionInsert.error;
      subscription = mapSubscriptionRow(productionInsert.data as DbSubscriptionRow);
    } else if (migrationInsert.error) {
      throw migrationInsert.error;
    }
  }

  if (!subscription) {
    subscription = mapSubscriptionRow({ id: company.id, company_id: company.id, plan_tier: "trial" });
  }

  return {
    company: mapCompanyRow(company as DbCompanyRow),
    subscription,
  };
}

export async function upsertCompanyInSupabase(
  ownerAccountId: string,
  updates: Partial<CompanyProfile>
): Promise<CompanyProfile | null> {
  const existing = await getCompanyByOwnerFromSupabase(ownerAccountId);
  if (!existing) return null;

  const { data, error } = await updateCompanyRow(existing.id, ownerAccountId, updates);
  if (error || !data) throw error ?? new Error("Company update failed");
  return mapCompanyRow(data as DbCompanyRow);
}

export async function migrateJsonCompanyToSupabase(input: {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
}): Promise<number> {
  let migrated = 0;

  for (const [accountId, slug] of Object.entries(input.accountLinks)) {
    const stored = input.companies[slug];
    if (!stored) continue;

    const existing = await getCompanyByOwnerFromSupabase(accountId);
    if (existing) continue;

    const name = stored.name ?? slug;
    const uniqueSlugValue = await generateUniqueCompanySlug(name);

    try {
      const { data: company, error } = await insertCompanyRow(accountId, uniqueSlugValue, {
        name,
        tagline: stored.tagline,
        industry: stored.industry,
        sizeRange: stored.sizeRange,
        headquarters: stored.headquarters,
        websiteUrl: stored.websiteUrl,
        about: stored.about,
        logoUrl: stored.logoUrl,
        coverImageUrl: stored.coverImageUrl,
        branches: stored.branches,
        announcement: stored.announcement,
      });

      if (error || !company) {
        console.warn("[company-supabase] migrate skip", accountId, error);
        continue;
      }

      const admin = createAdminClient();
      const subInsert = await admin.from("company_subscriptions").upsert(
        {
          company_id: company.id,
          status: "trial",
          free_jobs_limit: FREE_JOBS_LIMIT,
          annual_price_sar: ANNUAL_SUBSCRIPTION_SAR,
        },
        { onConflict: "company_id" }
      );

      if (subInsert.error && isMissingColumnError(subInsert.error)) {
        await admin.from("company_subscriptions").upsert(
          { company_id: company.id, plan_tier: "trial", status: "active" },
          { onConflict: "company_id" }
        );
      }

      migrated += 1;
    } catch (err) {
      console.warn("[company-supabase] migrate skip", accountId, err);
    }
  }

  return migrated;
}

export async function activateCompanySubscriptionInSupabase(
  companyId: string,
  expiresAt: string
): Promise<CompanySubscription> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const migration = await admin
    .from("company_subscriptions")
    .update({
      status: "active",
      subscription_started_at: now,
      subscription_expires_at: expiresAt,
      updated_at: now,
    })
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (!migration.error && migration.data) {
    return mapSubscriptionRow(migration.data as DbSubscriptionRow);
  }

  if (migration.error && !isMissingColumnError(migration.error)) throw migration.error;

  const production = await admin
    .from("company_subscriptions")
    .update({
      status: "active",
      plan_tier: "active",
      current_period_end: expiresAt,
      updated_at: now,
    })
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (production.error) throw production.error;
  return mapSubscriptionRow(production.data as DbSubscriptionRow);
}

export async function expireCompanySubscriptionInSupabase(
  companyId: string
): Promise<CompanySubscription | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("company_subscriptions")
    .update({
      status: "expired",
      updated_at: now,
    })
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSubscriptionRow(data as DbSubscriptionRow);
}

export async function incrementJobsPublishedCountInSupabase(
  companyId: string
): Promise<CompanySubscription> {
  const admin = createAdminClient();
  const existing = await getCompanySubscriptionFromSupabase(companyId);
  if (!existing) {
    throw new Error("Company subscription not found");
  }

  const { data, error } = await admin
    .from("company_subscriptions")
    .update({
      jobs_published_count: existing.jobsPublishedCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error && isMissingColumnError(error)) {
    return existing;
  }

  if (error) throw error;
  return mapSubscriptionRow(data as DbSubscriptionRow);
}
