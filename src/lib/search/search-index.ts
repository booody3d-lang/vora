import "server-only";

import { CACHE_KEYS, cacheGet, cacheSet } from "@/lib/cache/redis";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { listAllCompanies } from "@/lib/admin/admin-companies-store";
import { listActivePublicJobListings } from "@/lib/company/jobs-store";
import { listActiveMarketplaceServices } from "@/lib/freelance/services-store";
import { getStoreBySlugLive } from "@/lib/freelance/store-store";
import { isDemoDataEnabled } from "@/lib/env/demo-mode";
import { DEMO_STORE } from "@/lib/freelance/mock-data";
import { DEMO_JOBS, DEMO_PROFILES } from "@/lib/network/mock-data";
import {
  getProfileByAccountId,
  getProfileBySlug,
  listLinkedAccounts,
} from "@/lib/profile/profile-store";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isMissingColumnError, isMissingRelationError } from "@/lib/supabase/safe-db";

const INDEX_FILE = "search-index.json";

export type SearchResultType = "profile" | "job" | "company" | "store" | "service";

export interface SearchIndexEntry {
  id: string;
  type: SearchResultType;
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
  isPremium?: boolean;
}

interface SearchIndexFile {
  entries: SearchIndexEntry[];
  tokenIndex: Record<string, string[]>;
  builtAt: string;
}

type ProfileRow = {
  id?: string;
  full_name?: string | null;
  slug?: string | null;
  headline?: string | null;
};
type CompanyRow = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  tagline?: string | null;
  industry?: string | null;
  headquarters?: string | null;
};
type JobRow = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  location?: string | null;
  employment_type?: string | null;
  company_id?: string | null;
  status?: string | null;
  is_public?: boolean | null;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF]+/i)
    .filter((token) => token.length >= 2);
}

function buildTokenIndex(entries: SearchIndexEntry[]): Record<string, string[]> {
  const tokenIndex: Record<string, string[]> = {};
  for (const entry of entries) {
    const tokens = tokenize(`${entry.title} ${entry.subtitle} ${entry.keywords}`);
    for (const token of tokens) {
      if (!tokenIndex[token]) tokenIndex[token] = [];
      if (!tokenIndex[token].includes(entry.id)) tokenIndex[token].push(entry.id);
    }
  }
  return tokenIndex;
}

function profileEntryFromRow(row: ProfileRow): SearchIndexEntry | null {
  const id = String(row.id ?? "").trim();
  const fullName = String(row.full_name ?? "").trim();
  let slug = String(row.slug ?? "").trim();
  if (!id || !fullName) return null;
  if (!slug) slug = id.slice(0, 8);
  const headline = String(row.headline ?? "").trim();
  return {
    id: `profile-${id}`,
    type: "profile",
    slug,
    title: fullName,
    subtitle: headline,
    href: `/network/profile/${slug}`,
    keywords: [fullName, slug, headline].filter(Boolean).join(" "),
  };
}

function companyEntryFromRow(row: CompanyRow): SearchIndexEntry | null {
  const id = String(row.id ?? "").trim();
  const name = String(row.name ?? "").trim();
  const slug = String(row.slug ?? "").trim();
  if (!id || !name || !slug) return null;
  const tagline = String(row.tagline ?? "").trim();
  const industry = String(row.industry ?? "").trim();
  return {
    id: `company-${id}`,
    type: "company",
    slug,
    title: name,
    subtitle: tagline || industry,
    href: `/network/company/${slug}`,
    keywords: [name, tagline, industry, row.headquarters].filter(Boolean).join(" "),
  };
}

function jobEntryFromRow(row: JobRow, companyName = ""): SearchIndexEntry | null {
  const id = String(row.id ?? "").trim();
  const title = String(row.title ?? "").trim();
  const slug = String(row.slug ?? "").trim();
  if (!id || !title || !slug) return null;
  const location = String(row.location ?? "").trim();
  return {
    id: `job-${id}`,
    type: "job",
    slug,
    title,
    subtitle: [companyName, location].filter(Boolean).join(" · "),
    href: `/network/jobs/${slug}`,
    keywords: [title, companyName, location, row.employment_type].filter(Boolean).join(" "),
  };
}

async function collectProfilesFromSupabase(): Promise<SearchIndexEntry[]> {
  if (!isAdminClientAvailable()) return [];

  try {
    const admin = createAdminClient();
    const withHeadline = await admin
      .from("profiles")
      .select("id, full_name, slug, headline")
      .limit(2000);
    let rows: ProfileRow[] = [];

    if (!withHeadline.error && withHeadline.data) {
      rows = withHeadline.data as ProfileRow[];
    } else if (withHeadline.error && isMissingColumnError(withHeadline.error)) {
      const withSlug = await admin.from("profiles").select("id, full_name, slug").limit(2000);
      if (!withSlug.error && withSlug.data) {
        rows = withSlug.data as ProfileRow[];
      } else if (withSlug.error && isMissingColumnError(withSlug.error)) {
        const slim = await admin.from("profiles").select("id, full_name").limit(2000);
        if (!slim.error && slim.data) rows = slim.data as ProfileRow[];
      }
    } else if (withHeadline.error && !isMissingRelationError(withHeadline.error)) {
      console.error("[search-index] profiles query failed:", withHeadline.error.message);
      return [];
    }

    return rows
      .map((row) => profileEntryFromRow(row))
      .filter((entry): entry is SearchIndexEntry => Boolean(entry));
  } catch (error) {
    console.error("[search-index] collectProfilesFromSupabase failed:", error);
    return [];
  }
}

async function collectCompaniesFromSupabase(): Promise<SearchIndexEntry[]> {
  if (!isAdminClientAvailable()) return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("companies")
      .select("id, name, slug, tagline, industry, headquarters")
      .limit(2000);

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("[search-index] companies query failed:", error.message);
      }
      return [];
    }

    return ((data ?? []) as CompanyRow[])
      .map((row) => companyEntryFromRow(row))
      .filter((entry): entry is SearchIndexEntry => Boolean(entry));
  } catch (error) {
    console.error("[search-index] collectCompaniesFromSupabase failed:", error);
    return [];
  }
}

async function collectJobsFromSupabase(): Promise<SearchIndexEntry[]> {
  if (!isAdminClientAvailable()) return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("jobs")
      .select("id, slug, title, location, employment_type, company_id, status, is_public")
      .eq("is_public", true)
      .eq("status", "active")
      .limit(2000);

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("[search-index] jobs query failed:", error.message);
      }
      return [];
    }

    const rows = (data ?? []) as JobRow[];
    const companyIds = [...new Set(rows.map((row) => row.company_id).filter(Boolean))] as string[];
    const companyNames = new Map<string, string>();

    if (companyIds.length > 0) {
      const companies = await admin.from("companies").select("id, name").in("id", companyIds);
      if (!companies.error && companies.data) {
        for (const company of companies.data as Array<{ id?: string; name?: string | null }>) {
          if (company.id && company.name) companyNames.set(company.id, company.name);
        }
      }
    }

    return rows
      .map((row) => jobEntryFromRow(row, row.company_id ? companyNames.get(row.company_id) ?? "" : ""))
      .filter((entry): entry is SearchIndexEntry => Boolean(entry));
  } catch (error) {
    console.error("[search-index] collectJobsFromSupabase failed:", error);
    return [];
  }
}

async function collectProfiles(): Promise<SearchIndexEntry[]> {
  const byId = new Map<string, SearchIndexEntry>();

  for (const entry of await collectProfilesFromSupabase()) {
    byId.set(entry.id, entry);
  }

  const slugs = new Set<string>(isDemoDataEnabled() ? Object.keys(DEMO_PROFILES) : []);

  for (const accountId of listLinkedAccounts()) {
    const profile = getProfileByAccountId(accountId);
    if (profile?.slug) slugs.add(profile.slug);
  }

  for (const slug of slugs) {
    const profile = getProfileBySlug(slug) ?? (isDemoDataEnabled() ? DEMO_PROFILES[slug] : undefined);
    if (!profile) continue;
    const id = `profile-${profile.accountId ?? profile.id}`;
    byId.set(id, {
      id,
      type: "profile",
      slug: profile.slug,
      title: profile.fullName,
      subtitle: profile.headline,
      href: `/network/profile/${profile.slug}`,
      keywords: [profile.fullName, profile.headline, profile.location, profile.about]
        .filter(Boolean)
        .join(" "),
      isPremium: profile.isPremium,
    });
  }

  return [...byId.values()];
}

async function collectJobs(): Promise<SearchIndexEntry[]> {
  const byId = new Map<string, SearchIndexEntry>();

  for (const entry of await collectJobsFromSupabase()) {
    byId.set(entry.id, entry);
  }

  const liveJobs = await listActivePublicJobListings();
  for (const job of liveJobs) {
    byId.set(`job-${job.id}`, {
      id: `job-${job.id}`,
      type: "job",
      slug: job.slug,
      title: job.title,
      subtitle: `${job.company} · ${job.location}`,
      href: `/network/jobs/${job.slug}`,
      keywords: [job.title, job.company, job.location, job.employmentType].join(" "),
    });
  }

  if (isDemoDataEnabled()) {
    for (const job of DEMO_JOBS) {
      const id = `job-${job.id}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        type: "job",
        slug: job.slug,
        title: job.title,
        subtitle: `${job.company} · ${job.location}`,
        href: `/network/jobs/${job.slug}`,
        keywords: [job.title, job.company, job.location, job.employmentType].join(" "),
      });
    }
  }

  return [...byId.values()];
}

async function collectCompanies(): Promise<SearchIndexEntry[]> {
  const byId = new Map<string, SearchIndexEntry>();

  for (const entry of await collectCompaniesFromSupabase()) {
    byId.set(entry.id, entry);
  }

  const companies = await listAllCompanies();
  for (const company of companies) {
    byId.set(`company-${company.id}`, {
      id: `company-${company.id}`,
      type: "company",
      slug: company.slug,
      title: company.name,
      subtitle: company.tagline ?? company.industry ?? "",
      href: `/network/company/${company.slug}`,
      keywords: [company.name, company.tagline, company.industry, company.headquarters]
        .filter(Boolean)
        .join(" "),
    });
  }

  return [...byId.values()];
}

async function collectStores(): Promise<SearchIndexEntry[]> {
  const services = await listActiveMarketplaceServices();
  const seen = new Set<string>();
  const entries: SearchIndexEntry[] = [];

  for (const service of services) {
    if (seen.has(service.storeSlug)) continue;
    seen.add(service.storeSlug);

    const store =
      (await getStoreBySlugLive(service.storeSlug)) ??
      (isDemoDataEnabled() ? DEMO_STORE : null);
    if (!store) continue;
    entries.push({
      id: `store-${store.id}`,
      type: "store",
      slug: store.slug,
      title: store.storeName,
      subtitle: store.tagline ?? "",
      href: `/freelance/store/${store.slug}`,
      keywords: [store.storeName, store.tagline, store.description].filter(Boolean).join(" "),
      isPremium: store.isPremium,
    });
  }

  return entries;
}

async function collectServices(): Promise<SearchIndexEntry[]> {
  const services = await listActiveMarketplaceServices();
  return services.map((service) => ({
    id: `service-${service.id}`,
    type: "service" as const,
    slug: service.slug,
    title: service.title,
    subtitle: `${service.storeName} · ${service.category}`,
    href: `/freelance/services/${service.slug}`,
    keywords: [service.title, service.storeName, service.category, service.shortDescription]
      .filter(Boolean)
      .join(" "),
    isPremium: service.isSponsored || service.isFeatured,
  }));
}

export async function rebuildSearchIndex(): Promise<SearchIndexFile> {
  const entries = [
    ...(await collectProfiles()),
    ...(await collectJobs()),
    ...(await collectCompanies()),
    ...(await collectStores()),
    ...(await collectServices()),
  ];
  const index: SearchIndexFile = {
    entries,
    tokenIndex: buildTokenIndex(entries),
    builtAt: new Date().toISOString(),
  };
  writeJsonStore(INDEX_FILE, index);
  await cacheSet(CACHE_KEYS.searchIndexMeta, {
    builtAt: index.builtAt,
    entryCount: index.entries.length,
  });
  return index;
}

const INDEX_MAX_AGE_MS = 60_000;

function emptyIndex(): SearchIndexFile {
  return {
    entries: [],
    tokenIndex: {},
    builtAt: new Date(0).toISOString(),
  };
}

async function readIndex(options?: { allowRebuild?: boolean }): Promise<SearchIndexFile> {
  const index = readJsonStore<SearchIndexFile>(INDEX_FILE, emptyIndex);
  const ageMs = Date.now() - new Date(index.builtAt ?? 0).getTime();
  const stale = !Number.isFinite(ageMs) || ageMs > INDEX_MAX_AGE_MS;
  if ((!index.entries?.length || stale) && options?.allowRebuild !== false) {
    // Avoid blocking every search on a full rebuild — live Supabase is the source of truth.
    if (!index.entries?.length) return emptyIndex();
  }
  if (!index.tokenIndex) index.tokenIndex = buildTokenIndex(index.entries);
  return index;
}

async function liveSearchAllTypes(
  trimmed: string,
  limit: number,
  type?: SearchResultType
): Promise<SearchIndexEntry[]> {
  if (!isAdminClientAvailable()) return [];

  const admin = createAdminClient();
  const pattern = `%${trimmed}%`;
  const byId = new Map<string, SearchIndexEntry>();
  const wantProfiles = !type || type === "profile";
  const wantCompanies = !type || type === "company";
  const wantJobs = !type || type === "job";

  if (wantProfiles) {
    const mergeProfiles = (rows: ProfileRow[]) => {
      for (const row of rows) {
        const entry = profileEntryFromRow(row);
        if (entry) byId.set(entry.id, entry);
      }
    };

    const byName = await admin
      .from("profiles")
      .select("id, full_name, slug, headline")
      .ilike("full_name", pattern)
      .limit(limit);
    if (!byName.error && byName.data) {
      mergeProfiles(byName.data as ProfileRow[]);
    } else if (byName.error && isMissingColumnError(byName.error)) {
      const withSlug = await admin
        .from("profiles")
        .select("id, full_name, slug")
        .ilike("full_name", pattern)
        .limit(limit);
      if (!withSlug.error && withSlug.data) {
        mergeProfiles(withSlug.data as ProfileRow[]);
      } else if (withSlug.error && isMissingColumnError(withSlug.error)) {
        const slim = await admin
          .from("profiles")
          .select("id, full_name")
          .ilike("full_name", pattern)
          .limit(limit);
        if (!slim.error && slim.data) mergeProfiles(slim.data as ProfileRow[]);
      }
    }

    const bySlug = await admin
      .from("profiles")
      .select("id, full_name, slug, headline")
      .ilike("slug", pattern)
      .limit(limit);
    if (!bySlug.error && bySlug.data) {
      mergeProfiles(bySlug.data as ProfileRow[]);
    } else if (bySlug.error && isMissingColumnError(bySlug.error)) {
      const withSlug = await admin
        .from("profiles")
        .select("id, full_name, slug")
        .ilike("slug", pattern)
        .limit(limit);
      if (!withSlug.error && withSlug.data) mergeProfiles(withSlug.data as ProfileRow[]);
    }

    // Job title / headline on profiles (optional column in some schemas)
    const byHeadline = await admin
      .from("profiles")
      .select("id, full_name, slug, headline")
      .ilike("headline", pattern)
      .limit(limit);
    if (!byHeadline.error && byHeadline.data) {
      mergeProfiles(byHeadline.data as ProfileRow[]);
    }
  }

  if (wantCompanies) {
    const mergeCompanies = (rows: CompanyRow[]) => {
      for (const row of rows) {
        const entry = companyEntryFromRow(row);
        if (entry) byId.set(entry.id, entry);
      }
    };

    const byName = await admin
      .from("companies")
      .select("id, name, slug, tagline, industry, headquarters")
      .ilike("name", pattern)
      .limit(limit);
    if (!byName.error && byName.data) mergeCompanies(byName.data as CompanyRow[]);

    const bySlug = await admin
      .from("companies")
      .select("id, name, slug, tagline, industry, headquarters")
      .ilike("slug", pattern)
      .limit(limit);
    if (!bySlug.error && bySlug.data) mergeCompanies(bySlug.data as CompanyRow[]);

    const byIndustry = await admin
      .from("companies")
      .select("id, name, slug, tagline, industry, headquarters")
      .ilike("industry", pattern)
      .limit(limit);
    if (!byIndustry.error && byIndustry.data) mergeCompanies(byIndustry.data as CompanyRow[]);
  }

  if (wantJobs) {
    const jobs = await admin
      .from("jobs")
      .select("id, slug, title, location, employment_type, company_id, status, is_public")
      .eq("is_public", true)
      .eq("status", "active")
      .ilike("title", pattern)
      .limit(limit);

    if (!jobs.error && jobs.data) {
      const rows = jobs.data as JobRow[];
      const companyIds = [...new Set(rows.map((row) => row.company_id).filter(Boolean))] as string[];
      const companyNames = new Map<string, string>();
      if (companyIds.length > 0) {
        const companies = await admin.from("companies").select("id, name").in("id", companyIds);
        if (!companies.error && companies.data) {
          for (const company of companies.data as Array<{ id?: string; name?: string | null }>) {
            if (company.id && company.name) companyNames.set(company.id, company.name);
          }
        }
      }
      for (const row of rows) {
        const entry = jobEntryFromRow(
          row,
          row.company_id ? companyNames.get(row.company_id) ?? "" : ""
        );
        if (entry) byId.set(entry.id, entry);
      }
    }
  }

  return [...byId.values()].slice(0, limit);
}

export async function searchIndex(
  query: string,
  options?: { type?: SearchResultType; limit?: number }
): Promise<SearchIndexEntry[]> {
  const limit = options?.limit ?? 12;
  const trimmed = query.trim();

  if (!trimmed) return [];

  const cacheKey = CACHE_KEYS.searchResults(trimmed.toLowerCase(), options?.type, limit);
  const cached = await cacheGet<SearchIndexEntry[]>(cacheKey);
  if (cached?.length) return cached;

  const merged = new Map<string, SearchIndexEntry>();

  // Live Supabase first — works for every registered user/company/job on production.
  try {
    const live = await liveSearchAllTypes(trimmed, limit, options?.type);
    for (const entry of live) merged.set(entry.id, entry);
  } catch (error) {
    console.error("[search-index] live search failed:", error);
  }

  // Optionally enrich from local/demo index without forcing a slow rebuild.
  if (merged.size < limit) {
    try {
      const index = await readIndex({ allowRebuild: false });
      const lowered = trimmed.toLowerCase();
      const queryTokens = tokenize(lowered);
      const scoreMap = new Map<string, number>();

      for (const token of queryTokens) {
        const exactIds = index.tokenIndex[token] ?? [];
        for (const id of exactIds) scoreMap.set(id, (scoreMap.get(id) ?? 0) + 3);

        for (const [indexedToken, ids] of Object.entries(index.tokenIndex)) {
          if (indexedToken.startsWith(token) || token.startsWith(indexedToken)) {
            for (const id of ids) scoreMap.set(id, (scoreMap.get(id) ?? 0) + 1);
          }
        }
      }

      const entryById = new Map(index.entries.map((entry) => [entry.id, entry]));
      let indexedResults = [...scoreMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => entryById.get(id))
        .filter((entry): entry is SearchIndexEntry => Boolean(entry));

      if (indexedResults.length === 0) {
        indexedResults = index.entries.filter((entry) => {
          const haystack = `${entry.title} ${entry.subtitle} ${entry.keywords}`.toLowerCase();
          return haystack.includes(lowered);
        });
      }

      if (options?.type) {
        indexedResults = indexedResults.filter((entry) => entry.type === options.type);
      }

      for (const entry of indexedResults) {
        if (!merged.has(entry.id)) merged.set(entry.id, entry);
      }
    } catch (error) {
      console.error("[search-index] local index enrich failed:", error);
    }
  }

  const finalResults = [...merged.values()].slice(0, limit);
  if (finalResults.length > 0) {
    await cacheSet(cacheKey, finalResults, { ttlSeconds: 30 });
  }
  return finalResults;
}
