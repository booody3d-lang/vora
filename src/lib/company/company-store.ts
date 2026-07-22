import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { saveUploadedFile } from "@/lib/profile/profile-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import { DEMO_COMPANY, DEMO_SUBSCRIPTION } from "@/lib/company/mock-data";
import {
  activateCompanySubscriptionInSupabase,
  createCompanyInSupabase,
  expireCompanySubscriptionInSupabase,
  getCompanyByIdFromSupabase,
  getCompanyByOwnerFromSupabase,
  getCompanyBySlugFromSupabase,
  getCompanySubscriptionFromSupabase,
  migrateJsonCompanyToSupabase,
  upsertCompanyInSupabase,
  type CreateCompanyInput,
} from "@/lib/company/company-supabase";
import type { CompanyProfile, CompanySubscription } from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR, FREE_JOBS_LIMIT } from "@/types/company";

const DATA_FILE = "company-data.json";
const MIGRATION_FLAG = "company-supabase-migrated.json";

interface CompanyDataFile {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
  subscriptions: Record<string, CompanySubscription>;
}

let companyTableProbed = false;
let companyTableAvailable = false;

export async function isCompanySupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (companyTableProbed) return companyTableAvailable;

  companyTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("companies").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("companies missing", error);
      }
      companyTableAvailable = false;
      return false;
    }
    companyTableAvailable = true;
    return true;
  } catch {
    companyTableAvailable = false;
    return false;
  }
}

function readData(): CompanyDataFile {
  const data = readJsonStore(DATA_FILE, () => ({
    companies: {} as CompanyDataFile["companies"],
    accountLinks: {} as Record<string, string>,
    subscriptions: {} as Record<string, CompanySubscription>,
  }));
  if (!data.accountLinks) data.accountLinks = {};
  if (!data.companies) data.companies = {};
  if (!data.subscriptions) data.subscriptions = {};
  return data;
}

function writeData(data: CompanyDataFile) {
  writeJsonStore(DATA_FILE, data);
}

function mergeCompany(slug: string, data: CompanyDataFile): CompanyProfile | null {
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

function getCompanyBySlugFromJson(slug: string): CompanyProfile | null {
  const merged = mergeCompany(slug, readData());
  if (merged) return merged;
  if (slug === DEMO_COMPANY.slug) return DEMO_COMPANY;
  return null;
}

function getAccountLink(accountId: string): string | null {
  const data = readData();
  return data.accountLinks[accountId] ?? null;
}

async function maybeMigrateJsonToSupabase(): Promise<void> {
  if (!(await isCompanySupabaseReady())) return;

  const flag = readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean }));
  if (flag.done) return;

  const jsonData = readData();
  await runOptionalDbSyncVoid("company-json-migration", async () => {
    const migrated = await migrateJsonCompanyToSupabase(jsonData);
    writeJsonStore(MIGRATION_FLAG, {
      done: true,
      migratedAt: new Date().toISOString(),
      migratedCount: migrated,
    });
  });

  if (!readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean })).done) {
    writeJsonStore(MIGRATION_FLAG, { done: true, skipped: true });
  }
}

export function getCompanySlugForAccount(accountId: string): string | null {
  return getAccountLink(accountId);
}

export function getCompanyBySlugSync(slug: string): CompanyProfile | null {
  return getCompanyBySlugFromJson(slug);
}

export async function getCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  if (!(await isCompanySupabaseReady())) {
    return getCompanyBySlugFromJson(slug);
  }

  await maybeMigrateJsonToSupabase();

  return runOptionalDbSync(
    "getCompanyBySlug",
    () => getCompanyBySlugFromSupabase(slug),
    getCompanyBySlugFromJson(slug)
  );
}

export async function getCompanyByAccountId(accountId: string): Promise<CompanyProfile | null> {
  const slug = getAccountLink(accountId);
  const jsonFallback = slug ? getCompanyBySlugFromJson(slug) : null;

  if (!(await isCompanySupabaseReady())) {
    return jsonFallback;
  }

  await maybeMigrateJsonToSupabase();

  return runOptionalDbSync(
    "getCompanyByAccountId",
    () => getCompanyByOwnerFromSupabase(accountId),
    jsonFallback
  );
}

function getCompanyByIdFromJson(companyId: string): CompanyProfile | null {
  const data = readData();
  for (const slug of Object.keys(data.companies)) {
    const company = mergeCompany(slug, data);
    if (company?.id === companyId) return company;
  }
  if (DEMO_COMPANY.id === companyId) return DEMO_COMPANY;
  return null;
}

export function getCompanyByIdSync(companyId: string): CompanyProfile | null {
  return getCompanyByIdFromJson(companyId);
}

export function isKnownCompanyId(companyId: string): boolean {
  return getCompanyByIdFromJson(companyId) !== null;
}

export async function getCompanyById(companyId: string): Promise<CompanyProfile | null> {
  const jsonFallback = getCompanyByIdFromJson(companyId);

  if (!(await isCompanySupabaseReady())) {
    return jsonFallback;
  }

  await maybeMigrateJsonToSupabase();

  return runOptionalDbSync(
    "getCompanyById",
    () => getCompanyByIdFromSupabase(companyId),
    jsonFallback
  );
}

function getSubscriptionFromJson(accountId: string): CompanySubscription | null {
  return readData().subscriptions[accountId] ?? null;
}

function saveSubscriptionToJson(accountId: string, subscription: CompanySubscription) {
  const data = readData();
  data.subscriptions[accountId] = subscription;
  writeData(data);
}

export async function getCompanySubscriptionForAccount(
  accountId: string
): Promise<CompanySubscription | null> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return null;

  const jsonSub = getSubscriptionFromJson(accountId);
  const jsonFallback = jsonSub ?? DEMO_SUBSCRIPTION;

  if (!(await isCompanySupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getCompanySubscriptionForAccount",
    () => getCompanySubscriptionFromSupabase(company.id),
    jsonFallback
  );
}

export async function activateCompanySubscriptionForAccount(
  accountId: string,
  expiresAt: string
): Promise<CompanySubscription | null> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return null;

  const existing = (await getCompanySubscriptionForAccount(accountId)) ?? DEMO_SUBSCRIPTION;
  const activated: CompanySubscription = {
    ...existing,
    status: "active",
    subscriptionExpiresAt: expiresAt,
  };

  saveSubscriptionToJson(accountId, activated);

  if (!(await isCompanySupabaseReady())) {
    return activated;
  }

  return runOptionalDbSync(
    "activateCompanySubscriptionForAccount",
    () => activateCompanySubscriptionInSupabase(company.id, expiresAt),
    activated
  );
}

export async function expireCompanySubscriptionForAccount(
  accountId: string
): Promise<CompanySubscription | null> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return null;

  const existing = (await getCompanySubscriptionForAccount(accountId)) ?? DEMO_SUBSCRIPTION;
  const expired: CompanySubscription = {
    ...existing,
    status: "expired",
  };

  saveSubscriptionToJson(accountId, expired);

  if (!(await isCompanySupabaseReady())) {
    return expired;
  }

  return runOptionalDbSync(
    "expireCompanySubscriptionForAccount",
    () => expireCompanySubscriptionInSupabase(company.id),
    expired
  );
}

export async function createCompanyForAccount(
  accountId: string,
  input: CreateCompanyInput
): Promise<{ company: CompanyProfile; subscription: CompanySubscription }> {
  const data = readData();
  if (data.accountLinks[accountId]) {
    throw new Error("Company already exists for this account");
  }

  const slugBase = input.name.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "company";
  let slug = slugBase;
  let i = 2;
  while (data.companies[slug]) {
    slug = `${slugBase}-${i}`;
    i += 1;
  }

  const companyId = `co-${Date.now().toString(36)}`;
  const company: CompanyProfile = {
    id: companyId,
    slug,
    name: input.name.trim(),
    tagline: input.tagline,
    logoUrl: input.logoUrl,
    coverImageUrl: input.coverImageUrl,
    about: input.about,
    industry: input.industry,
    sizeRange: input.sizeRange,
    headquarters: input.headquarters,
    websiteUrl: input.websiteUrl,
    isVerified: false,
    employeeCount: 0,
    followerCount: 0,
    branches: input.branches ?? [],
    announcement: input.announcement,
  };

  data.companies[slug] = { ...company, accountId };
  data.accountLinks[accountId] = slug;
  writeData(data);

  let subscription = DEMO_SUBSCRIPTION;

  if (await isCompanySupabaseReady()) {
    const created = await runOptionalDbSync(
      "createCompanyForAccount",
      () => createCompanyInSupabase(accountId, input),
      { company, subscription }
    );

    company.id = created.company.id;
    company.slug = created.company.slug;
    subscription = created.subscription;

    data.companies[slug] = { ...company, accountId };
    data.accountLinks[accountId] = company.slug;
    if (company.slug !== slug) {
      delete data.companies[slug];
      data.companies[company.slug] = { ...company, accountId };
    }
    writeData(data);
  }

  if (!data.subscriptions) data.subscriptions = {};
  data.subscriptions[accountId] = subscription;
  writeData(data);

  return { company, subscription };
}

export async function updateCompanyForAccount(
  accountId: string,
  updates: Partial<CompanyProfile>
): Promise<CompanyProfile | null> {
  const data = readData();
  const slug = getAccountLink(accountId);
  if (!slug) return null;

  data.companies[slug] = {
    ...data.companies[slug],
    ...updates,
    accountId,
    slug,
    id: data.companies[slug]?.id ?? slug,
  };
  writeData(data);

  const jsonCompany = getCompanyBySlugFromJson(slug);
  if (!(await isCompanySupabaseReady())) {
    return jsonCompany;
  }

  return runOptionalDbSync(
    "updateCompanyForAccount",
    () => upsertCompanyInSupabase(accountId, updates),
    jsonCompany
  );
}

export { saveUploadedFile };
