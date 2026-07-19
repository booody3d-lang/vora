import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { saveUploadedFile } from "@/lib/profile/profile-store";
import type { CompanyProfile } from "@/types/company";

const DATA_FILE = "company-data.json";

interface CompanyDataFile {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
}

function readData(): CompanyDataFile {
  const data = readJsonStore(DATA_FILE, () => ({
    companies: {} as CompanyDataFile["companies"],
    accountLinks: {} as Record<string, string>,
  }));
  if (!data.accountLinks) data.accountLinks = {};
  if (!data.companies) data.companies = {};
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

function getAccountLink(accountId: string): string | null {
  const data = readData();
  return data.accountLinks[accountId] ?? null;
}

export function getCompanySlugForAccount(accountId: string): string | null {
  return getAccountLink(accountId);
}

export function getCompanyBySlug(slug: string): CompanyProfile | null {
  return mergeCompany(slug, readData());
}

export function getCompanyByAccountId(accountId: string): CompanyProfile | null {
  const slug = getAccountLink(accountId);
  if (!slug) return null;
  return getCompanyBySlug(slug);
}

export function getCompanyById(companyId: string): CompanyProfile | null {
  const data = readData();
  for (const slug of Object.keys(data.companies)) {
    const company = mergeCompany(slug, data);
    if (company?.id === companyId) return company;
  }
  return null;
}

export function updateCompanyForAccount(
  accountId: string,
  updates: Partial<CompanyProfile>
): CompanyProfile | null {
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
  return getCompanyBySlug(slug);
}

export { saveUploadedFile };
