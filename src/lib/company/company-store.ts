import "server-only";

import fs from "fs";
import path from "path";
import { saveUploadedFile } from "@/lib/profile/profile-store";
import type { CompanyProfile } from "@/types/company";

const DATA_DIR = path.join(process.cwd(), ".data", "vora");
const DATA_FILE = path.join(DATA_DIR, "company-data.json");

interface CompanyDataFile {
  companies: Record<string, Partial<CompanyProfile> & { accountId?: string }>;
  accountLinks: Record<string, string>;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): CompanyDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: CompanyDataFile = {
      companies: {},
      accountLinks: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as CompanyDataFile;
  if (!data.accountLinks) data.accountLinks = {};
  if (!data.companies) data.companies = {};
  return data;
}

function writeData(data: CompanyDataFile) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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
