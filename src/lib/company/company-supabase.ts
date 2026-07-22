import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import type { CompanyBranch, CompanyProfile, CompanySubscription } from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR, FREE_JOBS_LIMIT } from "@/types/company";

interface DbCompanyRow {
  id: string;
  owner_account_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  about: string | null;
  industry: string | null;
  size_range: string | null;
  headquarters: string | null;
  website_url: string | null;
  is_verified: boolean;
  employee_count: number | null;
  follower_count: number;
  branches: CompanyBranch[] | null;
  announcement: string | null;
  created_at: string;
  updated_at: string;
}

interface DbSubscriptionRow {
  id: string;
  company_id: string;
  status: CompanySubscription["status"];
  trial_started_at: string;
  trial_ends_at: string;
  jobs_published_count: number;
  free_jobs_limit: number;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  annual_price_sar: number;
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
    coverImageUrl: row.cover_image_url ?? undefined,
    about: row.about ?? undefined,
    industry: row.industry ?? undefined,
    sizeRange: row.size_range ?? undefined,
    headquarters: row.headquarters ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    isVerified: row.is_verified,
    employeeCount: row.employee_count ?? 0,
    followerCount: row.follower_count,
    branches: parseBranches(row.branches),
    announcement: row.announcement ?? undefined,
  };
}

export function mapSubscriptionRow(row: DbSubscriptionRow): CompanySubscription {
  return {
    status: row.status,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    jobsPublishedCount: row.jobs_published_count,
    freeJobsLimit: row.free_jobs_limit,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    annualPriceSar: Number(row.annual_price_sar),
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

function mapProfileUpdatesToRow(
  updates: Partial<CompanyProfile>
): Record<string, unknown> {
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
  const row = mapProfileToInsertRow(ownerAccountId, slug, input);

  const { data: company, error } = await admin
    .from("companies")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;

  let subscription = await getCompanySubscriptionFromSupabase(company.id);
  if (!subscription) {
    const { data: subRow, error: subError } = await admin
      .from("company_subscriptions")
      .insert({
        company_id: company.id,
        status: "trial",
        free_jobs_limit: FREE_JOBS_LIMIT,
        annual_price_sar: ANNUAL_SUBSCRIPTION_SAR,
      })
      .select("*")
      .single();

    if (subError) throw subError;
    subscription = mapSubscriptionRow(subRow as DbSubscriptionRow);
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
  const admin = createAdminClient();
  const existing = await getCompanyByOwnerFromSupabase(ownerAccountId);
  if (!existing) return null;

  const patch = mapProfileUpdatesToRow(updates);
  const { data, error } = await admin
    .from("companies")
    .update(patch)
    .eq("id", existing.id)
    .eq("owner_account_id", ownerAccountId)
    .select("*")
    .single();

  if (error) throw error;
  return mapCompanyRow(data as DbCompanyRow);
}

export async function migrateJsonCompanyToSupabase(input: {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
}): Promise<number> {
  const admin = createAdminClient();
  let migrated = 0;

  for (const [accountId, slug] of Object.entries(input.accountLinks)) {
    const stored = input.companies[slug];
    if (!stored) continue;

    const { data: existing } = await admin
      .from("companies")
      .select("id")
      .eq("owner_account_id", accountId)
      .maybeSingle();

    if (existing) continue;

    const name = stored.name ?? slug;
    const uniqueSlugValue = await generateUniqueCompanySlug(name);

    const { data: company, error } = await admin
      .from("companies")
      .insert(
        mapProfileToInsertRow(accountId, uniqueSlugValue, {
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
        })
      )
      .select("id")
      .single();

    if (error) {
      console.warn("[company-supabase] migrate skip", accountId, error.message);
      continue;
    }

    await admin.from("company_subscriptions").upsert(
      {
        company_id: company.id,
        status: "trial",
        free_jobs_limit: FREE_JOBS_LIMIT,
        annual_price_sar: ANNUAL_SUBSCRIPTION_SAR,
      },
      { onConflict: "company_id" }
    );

    migrated += 1;
  }

  return migrated;
}

export async function activateCompanySubscriptionInSupabase(
  companyId: string,
  expiresAt: string
): Promise<CompanySubscription> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
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

  if (error) throw error;
  return mapSubscriptionRow(data as DbSubscriptionRow);
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

  if (error) throw error;
  return mapSubscriptionRow(data as DbSubscriptionRow);
}
