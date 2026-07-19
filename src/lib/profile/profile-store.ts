import "server-only";

import fs from "fs";
import path from "path";
import { ensureVoraDataDir, getVoraDataDir } from "@/lib/storage/data-dir";
import { calculateProfessionalScore } from "@/lib/professional-score/calculator";
import { findAccountById } from "@/lib/security/demo-store";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import type { FreelancerStore, MarketplaceService } from "@/types/freelance";
import type { FullProfessionalProfile } from "@/types/network";
import type { AccountLink, UserGender } from "@/types/profile";
import type { VoraRole } from "@/types/security";

const DATA_DIR = getVoraDataDir();
const DATA_FILE = path.join(DATA_DIR, "profile-data.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

interface StoredProfile extends Partial<FullProfessionalProfile> {
  accountId?: string;
  gender?: UserGender;
}

interface StoredStore extends Partial<FreelancerStore> {
  accountId?: string;
}

interface ProfileDataFile {
  profiles: Record<string, StoredProfile>;
  stores: Record<string, StoredStore>;
  storeServices: Record<string, MarketplaceService[]>;
  accountLinks: Record<string, AccountLink>;
}

function ensureDataDir() {
  ensureVoraDataDir();
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readData(): ProfileDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: ProfileDataFile = {
      profiles: {},
      stores: {},
      storeServices: {},
      accountLinks: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return normalizeServices(JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ProfileDataFile);
}

function normalizeServices(data: ProfileDataFile): ProfileDataFile {
  if (!data.profiles) data.profiles = {};
  if (!data.stores) data.stores = {};
  if (!data.storeServices) data.storeServices = {};
  if (!data.accountLinks) data.accountLinks = {};
  return data;
}

function readDataNormalized(): ProfileDataFile {
  return normalizeServices(readData());
}

function writeData(data: ProfileDataFile) {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[profile-store] Failed to persist profile data:", error);
  }
}

function allSlugs(data: ProfileDataFile): Set<string> {
  return new Set(Object.keys(data.profiles));
}

function scoreFromProfile(profile: FullProfessionalProfile): number {
  return calculateProfessionalScore({
    profilePhotoUrl: profile.profilePhotoUrl,
    coverImageUrl: profile.coverImageUrl,
    headline: profile.headline,
    about: profile.about,
    resumeUrl: profile.resumeUrl,
    videoIntroUrl: profile.videoIntroUrl,
    verifiedExperienceCount: profile.experiences.filter((e) => e.isVerified).length,
    verifiedEducationCount: profile.education.filter((e) => e.isVerified).length,
    skillCount: profile.skills.length,
    certificationCount: profile.certifications.length,
  }).total;
}

function emptyProfile(input: {
  accountId: string;
  slug: string;
  fullName: string;
  gender?: UserGender;
}): FullProfessionalProfile {
  return {
    id: input.accountId,
    slug: input.slug,
    fullName: input.fullName,
    headline: "",
    profilePhotoUrl: "",
    coverImageUrl: "",
    location: "",
    isVerified: false,
    isPremium: false,
    professionalScore: 0,
    hasFreelancerStore: false,
    about: "",
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    languages: [],
    projects: [],
    gender: input.gender,
    accountId: input.accountId,
  };
}

function mergeProfile(slug: string, data: ProfileDataFile): FullProfessionalProfile | null {
  const stored = data.profiles[slug];
  if (!stored) return null;

  const accountId = stored.accountId ?? stored.id ?? slug;
  const merged: FullProfessionalProfile = {
    ...emptyProfile({
      accountId,
      slug,
      fullName: stored.fullName ?? slug,
      gender: stored.gender,
    }),
    ...stored,
    slug,
    id: stored.id ?? accountId,
    accountId,
    experiences: stored.experiences ?? [],
    education: stored.education ?? [],
    certifications: stored.certifications ?? [],
    skills: stored.skills ?? [],
    languages: stored.languages ?? [],
    projects: stored.projects ?? [],
    gender: stored.gender,
  };

  merged.professionalScore = scoreFromProfile(merged);

  const accountLink = Object.values(data.accountLinks).find((l) => l.profileSlug === slug);
  if (accountLink?.storeSlug && data.stores[accountLink.storeSlug]) {
    merged.freelancerStoreSlug = accountLink.storeSlug;
    merged.hasFreelancerStore = true;
  }
  if (stored.showVisitStoreOnProfile === undefined && merged.hasFreelancerStore) {
    merged.showVisitStoreOnProfile = true;
  }

  return merged;
}

function mergeStore(slug: string, data: ProfileDataFile): FreelancerStore | null {
  const stored = data.stores[slug];
  if (!stored) return null;

  return {
    id: stored.id ?? slug,
    slug,
    seoSlug: stored.seoSlug ?? slug,
    storeName: stored.storeName ?? slug,
    tagline: stored.tagline ?? "",
    description: stored.description ?? "",
    logoUrl: stored.logoUrl ?? "",
    coverImageUrl: stored.coverImageUrl ?? "",
    professionalProfileSlug: stored.professionalProfileSlug ?? "",
    videoIntroUrl: stored.videoIntroUrl,
    isVerified: stored.isVerified ?? false,
    ratingAvg: stored.ratingAvg ?? 0,
    totalReviews: stored.totalReviews ?? 0,
    viewCount: stored.viewCount ?? 0,
    conversionRate: stored.conversionRate ?? 0,
    ...stored,
  } as FreelancerStore;
}

export function getAccountLink(accountId: string): AccountLink | null {
  const data = readData();
  return data.accountLinks[accountId] ?? null;
}

export function getProfileSlugForAccount(accountId: string): string | null {
  return getAccountLink(accountId)?.profileSlug ?? null;
}

export function getStoreSlugForAccount(accountId: string): string | null {
  return getAccountLink(accountId)?.storeSlug ?? null;
}

export function getProfileBySlug(slug: string): FullProfessionalProfile | null {
  return mergeProfile(slug, readData());
}

export function getProfileByAccountId(accountId: string): FullProfessionalProfile | null {
  const link = getAccountLink(accountId);
  if (!link) return null;
  return getProfileBySlug(link.profileSlug);
}

export function getGenderForAccount(accountId: string): UserGender | undefined {
  return getProfileByAccountId(accountId)?.gender;
}

export function listLinkedAccounts(): string[] {
  const data = readData();
  return Object.keys(data.accountLinks);
}

export function getAccountIdByProfileSlug(slug: string): string | null {
  const data = readData();
  for (const [accountId, link] of Object.entries(data.accountLinks)) {
    if (link.profileSlug === slug) return accountId;
  }
  return null;
}

export function getAccountIdByStoreSlug(slug: string): string | null {
  const data = readData();
  for (const [accountId, link] of Object.entries(data.accountLinks)) {
    if (link.storeSlug === slug) return accountId;
  }
  return null;
}

export function getStoreBySlug(slug: string): FreelancerStore | null {
  return mergeStore(slug, readData());
}

export function getStoreByAccountId(accountId: string): FreelancerStore | null {
  const link = getAccountLink(accountId);
  if (!link?.storeSlug) return null;
  return getStoreBySlug(link.storeSlug);
}

export function isProfileOwner(accountId: string, slug: string): boolean {
  return getAccountLink(accountId)?.profileSlug === slug;
}

export function isStoreOwner(accountId: string, slug: string): boolean {
  return getAccountLink(accountId)?.storeSlug === slug;
}

export function createProfileForAccount(input: {
  accountId: string;
  fullName: string;
  email: string;
  role: VoraRole;
  gender?: UserGender;
  hasFreelancerStore?: boolean;
}): AccountLink {
  const data = readData();
  const slug = uniqueSlug(slugifyName(input.fullName), allSlugs(data));

  data.profiles[slug] = {
    accountId: input.accountId,
    slug,
    id: input.accountId,
    fullName: input.fullName,
    gender: input.gender,
    headline: "",
    about: "",
    profilePhotoUrl: "",
    coverImageUrl: "",
    location: "",
    contactEmail: input.email,
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    languages: [],
    projects: [],
    hasFreelancerStore: Boolean(input.hasFreelancerStore),
  };

  const link: AccountLink = { profileSlug: slug };

  if (input.hasFreelancerStore || input.role === "professional") {
    const storeSlug = uniqueSlug(`${slug}-store`, new Set(Object.keys(data.stores)));
    data.stores[storeSlug] = {
      accountId: input.accountId,
      slug: storeSlug,
      seoSlug: storeSlug,
      storeName: `${input.fullName.split(" ")[0]} Studio`,
      tagline: "",
      description: "",
      logoUrl: "",
      coverImageUrl: "",
      professionalProfileSlug: slug,
      isVerified: false,
      ratingAvg: 0,
      totalReviews: 0,
      viewCount: 0,
      conversionRate: 0,
    };
    link.storeSlug = storeSlug;
    data.profiles[slug]!.hasFreelancerStore = true;
    data.profiles[slug]!.freelancerStoreSlug = storeSlug;
  }

  data.accountLinks[input.accountId] = link;
  writeData(data);
  return link;
}

/** Ensures the account has a linked freelancer store (Khamsat-style dual identity). */
export function ensureFreelancerStoreForAccount(accountId: string): AccountLink | null {
  let link = getAccountLink(accountId);

  if (!link?.profileSlug) {
    const account = findAccountById(accountId);
    if (!account) return null;
    link = createProfileForAccount({
      accountId,
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      gender: account.gender,
    });
  }

  const data = readData();
  link = getAccountLink(accountId);
  if (!link?.profileSlug) return null;

  const profileSlug = link.profileSlug;
  if (!data.profiles[profileSlug]) {
    const account = findAccountById(accountId);
    if (!account) return null;
    data.profiles[profileSlug] = {
      accountId,
      slug: profileSlug,
      id: accountId,
      fullName: account.fullName,
      gender: account.gender,
      headline: "",
      about: "",
      profilePhotoUrl: "",
      coverImageUrl: "",
      location: "",
      contactEmail: account.email,
      experiences: [],
      education: [],
      certifications: [],
      skills: [],
      languages: [],
      projects: [],
      hasFreelancerStore: false,
    };
  }

  if (link.storeSlug && data.stores[link.storeSlug]) {
    writeData(data);
    return link;
  }

  const profile = data.profiles[profileSlug];
  const storeSlug = uniqueSlug(`${profileSlug}-store`, new Set(Object.keys(data.stores)));
  const storeName = profile?.fullName
    ? `${profile.fullName.split(" ")[0]} Store`
    : "My Store";

  data.stores[storeSlug] = {
    accountId,
    slug: storeSlug,
    seoSlug: storeSlug,
    storeName,
    tagline: "",
    description: "",
    logoUrl: "",
    coverImageUrl: "",
    professionalProfileSlug: profileSlug,
    isVerified: false,
    ratingAvg: 0,
    totalReviews: 0,
    viewCount: 0,
    conversionRate: 0,
  };

  link = { ...link, storeSlug };
  data.accountLinks[accountId] = link;
  data.profiles[profileSlug] = {
    ...data.profiles[profileSlug],
    hasFreelancerStore: true,
    freelancerStoreSlug: storeSlug,
    showVisitStoreOnProfile: data.profiles[profileSlug]?.showVisitStoreOnProfile ?? true,
  };

  writeData(data);
  return link;
}

export function updateProfileForAccount(
  accountId: string,
  updates: Partial<FullProfessionalProfile> & { gender?: UserGender }
): FullProfessionalProfile | null {
  const data = readData();
  const link = getAccountLink(accountId);
  if (!link) return null;

  const slug = link.profileSlug;
  const current = mergeProfile(slug, data);
  if (!current) return null;

  data.profiles[slug] = {
    ...data.profiles[slug],
    ...updates,
    accountId,
    slug,
    id: accountId,
    experiences: updates.experiences ?? data.profiles[slug]?.experiences ?? current.experiences,
    education: updates.education ?? data.profiles[slug]?.education ?? current.education,
    certifications:
      updates.certifications ?? data.profiles[slug]?.certifications ?? current.certifications,
    skills: updates.skills ?? data.profiles[slug]?.skills ?? current.skills,
    languages: updates.languages ?? data.profiles[slug]?.languages ?? current.languages,
    projects: updates.projects ?? data.profiles[slug]?.projects ?? current.projects,
  };

  writeData(data);
  return getProfileBySlug(slug);
}

export function updateStoreForAccount(
  accountId: string,
  updates: Partial<FreelancerStore>
): FreelancerStore | null {
  const data = readData();
  const link = getAccountLink(accountId);
  if (!link?.storeSlug) return null;

  const slug = link.storeSlug;
  data.stores[slug] = { ...data.stores[slug], ...updates, accountId, slug };
  writeData(data);
  return getStoreBySlug(slug);
}

export function getStoreServices(storeSlug: string): MarketplaceService[] {
  const data = readDataNormalized();
  return data.storeServices[storeSlug] ?? [];
}

export function getStoreServicesForAccount(accountId: string): MarketplaceService[] {
  const link = getAccountLink(accountId);
  if (!link?.storeSlug) return [];
  return getStoreServices(link.storeSlug);
}

export function listAllMarketplaceServices(): MarketplaceService[] {
  const data = readDataNormalized();
  return Object.values(data.storeServices).flat();
}

export function saveStoreServicesForAccount(
  accountId: string,
  services: MarketplaceService[]
): MarketplaceService[] | null {
  const data = readDataNormalized();
  const link = getAccountLink(accountId);
  if (!link?.storeSlug) return null;

  const store = getStoreBySlug(link.storeSlug);
  if (!store) return null;

  data.storeServices[link.storeSlug] = services.map((service) => ({
    ...service,
    storeId: store.id,
    storeSlug: store.slug,
    storeName: store.storeName,
    sellerAvatar: store.logoUrl ?? service.sellerAvatar,
  }));

  writeData(data);
  return getStoreServices(link.storeSlug);
}

export function saveUploadedFile(accountId: string, filename: string, buffer: Buffer): string {
  ensureDataDir();
  const dir = path.join(UPLOADS_DIR, accountId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/api/profile/media/${accountId}/${filename}`;
}

export function readUploadedFile(accountId: string, filename: string): Buffer | null {
  const filePath = path.join(UPLOADS_DIR, accountId, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function getUploadContentType(filename: string): string {
  if (filename.endsWith(".webp")) return "image/webp";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
