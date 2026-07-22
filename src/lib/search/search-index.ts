import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { listAllCompanies } from "@/lib/admin/admin-companies-store";
import { listActivePublicJobListings } from "@/lib/company/jobs-store";
import { listActiveMarketplaceServices } from "@/lib/freelance/services-store";
import { getStoreBySlugLive } from "@/lib/freelance/store-store";
import { DEMO_STORE } from "@/lib/freelance/mock-data";
import { DEMO_JOBS, DEMO_PROFILES } from "@/lib/network/mock-data";
import {
  getProfileByAccountId,
  getProfileBySlug,
  listLinkedAccounts,
} from "@/lib/profile/profile-store";

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

function collectProfiles(): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  const slugs = new Set<string>(Object.keys(DEMO_PROFILES));

  for (const accountId of listLinkedAccounts()) {
    const profile = getProfileByAccountId(accountId);
    if (profile?.slug) slugs.add(profile.slug);
  }

  for (const slug of slugs) {
    const profile = getProfileBySlug(slug) ?? DEMO_PROFILES[slug];
    if (!profile) continue;
    entries.push({
      id: `profile-${profile.id}`,
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

  return entries;
}

async function collectJobs(): Promise<SearchIndexEntry[]> {
  const entries: SearchIndexEntry[] = [];
  const seen = new Set<string>();

  const liveJobs = await listActivePublicJobListings();
  for (const job of liveJobs) {
    if (seen.has(job.slug)) continue;
    seen.add(job.slug);
    entries.push({
      id: `job-${job.id}`,
      type: "job",
      slug: job.slug,
      title: job.title,
      subtitle: `${job.company} · ${job.location}`,
      href: `/network/jobs/${job.slug}`,
      keywords: [job.title, job.company, job.location, job.employmentType].join(" "),
    });
  }

  for (const job of DEMO_JOBS) {
    if (seen.has(job.slug)) continue;
    seen.add(job.slug);
    entries.push({
      id: `job-${job.id}`,
      type: "job",
      slug: job.slug,
      title: job.title,
      subtitle: `${job.company} · ${job.location}`,
      href: `/network/jobs/${job.slug}`,
      keywords: [job.title, job.company, job.location, job.employmentType].join(" "),
    });
  }

  return entries;
}

async function collectCompanies(): Promise<SearchIndexEntry[]> {
  const companies = await listAllCompanies();
  const seen = new Set<string>();
  const entries: SearchIndexEntry[] = [];

  for (const company of companies) {
    if (seen.has(company.slug)) continue;
    seen.add(company.slug);
    entries.push({
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

  return entries;
}

async function collectStores(): Promise<SearchIndexEntry[]> {
  const services = await listActiveMarketplaceServices();
  const seen = new Set<string>();
  const entries: SearchIndexEntry[] = [];

  for (const service of services) {
    if (seen.has(service.storeSlug)) continue;
    seen.add(service.storeSlug);

    const store = (await getStoreBySlugLive(service.storeSlug)) ?? DEMO_STORE;
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
    ...collectProfiles(),
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
  return index;
}

async function readIndex(): Promise<SearchIndexFile> {
  const index = readJsonStore<SearchIndexFile>(INDEX_FILE, () => ({
    entries: [],
    tokenIndex: {},
    builtAt: new Date(0).toISOString(),
  }));
  if (!index.entries?.length) return rebuildSearchIndex();
  if (!index.tokenIndex) index.tokenIndex = buildTokenIndex(index.entries);
  return index;
}

export async function searchIndex(
  query: string,
  options?: { type?: SearchResultType; limit?: number }
): Promise<SearchIndexEntry[]> {
  const index = await readIndex();
  const limit = options?.limit ?? 12;
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) return [];

  const queryTokens = tokenize(trimmed);
  const scoreMap = new Map<string, number>();

  for (const token of queryTokens) {
    const exactIds = index.tokenIndex[token] ?? [];
    for (const id of exactIds) {
      scoreMap.set(id, (scoreMap.get(id) ?? 0) + 3);
    }

    for (const [indexedToken, ids] of Object.entries(index.tokenIndex)) {
      if (indexedToken.startsWith(token) || token.startsWith(indexedToken)) {
        for (const id of ids) {
          scoreMap.set(id, (scoreMap.get(id) ?? 0) + 1);
        }
      }
    }
  }

  const entryById = new Map(index.entries.map((entry) => [entry.id, entry]));
  let results = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => entryById.get(id))
    .filter((entry): entry is SearchIndexEntry => Boolean(entry));

  if (options?.type) {
    results = results.filter((entry) => entry.type === options.type);
  }

  if (results.length === 0) {
    results = index.entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.subtitle} ${entry.keywords}`.toLowerCase();
      return haystack.includes(trimmed);
    });
    if (options?.type) results = results.filter((entry) => entry.type === options.type);
  }

  return results.slice(0, limit);
}
