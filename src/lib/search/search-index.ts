import "server-only";

import fs from "fs";
import path from "path";
import { DEMO_COMPANY, DEMO_JOBS as COMPANY_JOBS } from "@/lib/company/mock-data";
import { getCompanyBySlug } from "@/lib/company/company-store";
import { DEMO_JOBS, DEMO_PROFILES } from "@/lib/network/mock-data";
import {
  getProfileByAccountId,
  getProfileBySlug,
  listLinkedAccounts,
} from "@/lib/profile/profile-store";

const DATA_DIR = path.join(process.cwd(), ".data", "vora");
const INDEX_FILE = path.join(DATA_DIR, "search-index.json");

export type SearchResultType = "profile" | "job" | "company";

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

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

function collectJobs(): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  const seen = new Set<string>();

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

  for (const job of COMPANY_JOBS) {
    if (seen.has(job.slug)) continue;
    seen.add(job.slug);
    entries.push({
      id: `job-${job.id}`,
      type: "job",
      slug: job.slug,
      title: job.title,
      subtitle: `${DEMO_COMPANY.name} · ${job.location}`,
      href: `/network/jobs/${job.slug}`,
      keywords: [job.title, DEMO_COMPANY.name, job.location, ...(job.requiredSkills ?? [])].join(
        " "
      ),
    });
  }

  return entries;
}

function collectCompanies(): SearchIndexEntry[] {
  const companies = [DEMO_COMPANY];
  const stored = getCompanyBySlug(DEMO_COMPANY.slug);
  if (stored && stored.slug !== DEMO_COMPANY.slug) companies.push(stored);

  return companies.map((company) => ({
    id: `company-${company.id}`,
    type: "company" as const,
    slug: company.slug,
    title: company.name,
    subtitle: company.tagline ?? company.industry ?? "",
    href: `/network/company/${company.slug}`,
    keywords: [company.name, company.tagline, company.industry, company.headquarters]
      .filter(Boolean)
      .join(" "),
  }));
}

export function rebuildSearchIndex(): SearchIndexFile {
  const entries = [...collectProfiles(), ...collectJobs(), ...collectCompanies()];
  const index: SearchIndexFile = {
    entries,
    tokenIndex: buildTokenIndex(entries),
    builtAt: new Date().toISOString(),
  };
  ensureDataDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  return index;
}

function readIndex(): SearchIndexFile {
  ensureDataDir();
  if (!fs.existsSync(INDEX_FILE)) return rebuildSearchIndex();
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8")) as SearchIndexFile;
  if (!index.entries?.length) return rebuildSearchIndex();
  if (!index.tokenIndex) index.tokenIndex = buildTokenIndex(index.entries);
  return index;
}

export function searchIndex(
  query: string,
  options?: { type?: SearchResultType; limit?: number }
): SearchIndexEntry[] {
  const index = readIndex();
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
