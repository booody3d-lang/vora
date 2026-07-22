import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isMissingRelationError,
  isSupabaseDbSyncEnabled,
  markSupabaseDbSyncUnavailable,
  probeCoreSchema,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  ensureFreelancerStoreForAccount,
  getAccountIdByProfileSlug,
  getAccountLink,
  getProfileByAccountId,
  getProfileBySlug,
  syncJsonCacheFromSupabase,
  updateProfileForAccount,
  createProfileForAccount,
} from "@/lib/profile/profile-store";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import { calculateProfessionalScore } from "@/lib/professional-score/calculator";
import {
  fetchStoreRowByAccountId as fetchStoreRowByAccountIdUnsafe,
  type DbStoreRow,
} from "@/lib/freelance/store-supabase";
import {
  getStoreBySlugLive,
  getStoreForAccount,
  resolveAccountIdForStoreSlugLive,
  updateStoreForAccountLive,
} from "@/lib/freelance/store-store";
import type { FullProfessionalProfile } from "@/types/network";
import type { AuthUser } from "@/types/security";

export function isSupabasePersistenceEnabled(): boolean {
  return isSupabaseConfigured() && isAdminClientAvailable() && isSupabaseDbSyncEnabled();
}

async function ensureDbReadyForSync(): Promise<boolean> {
  if (!isSupabaseConfigured() || !isAdminClientAvailable()) return false;
  if (!isSupabaseDbSyncEnabled()) return false;
  return probeCoreSchema();
}

interface DbProfileRow {
  id: string;
  account_id: string;
  slug: string;
  headline: string | null;
  about: string | null;
  profile_photo_url: string | null;
  cover_image_url: string | null;
  resume_url: string | null;
  video_intro_url: string | null;
  location: string | null;
  contact_email: string | null;
  full_name: string | null;
  gender: string | null;
  professional_score: number | null;
  is_verified: boolean | null;
  is_premium: boolean | null;
  website_url: string | null;
  contact_phone: string | null;
  current_role: string | null;
}

function mapDbProfileRow(row: DbProfileRow, base?: FullProfessionalProfile | null): FullProfessionalProfile {
  const accountId = row.account_id;
  const fullName = row.full_name ?? base?.fullName ?? row.slug;
  const merged: FullProfessionalProfile = {
    id: accountId,
    accountId,
    slug: row.slug,
    fullName,
    headline: row.headline ?? base?.headline ?? "",
    about: row.about ?? base?.about ?? "",
    profilePhotoUrl: row.profile_photo_url ?? base?.profilePhotoUrl ?? "",
    coverImageUrl: row.cover_image_url ?? base?.coverImageUrl ?? "",
    resumeUrl: row.resume_url ?? base?.resumeUrl ?? "",
    videoIntroUrl: row.video_intro_url ?? base?.videoIntroUrl ?? "",
    location: row.location ?? base?.location ?? "",
    contactEmail: row.contact_email ?? base?.contactEmail,
    websiteUrl: row.website_url ?? base?.websiteUrl,
    contactPhone: row.contact_phone ?? base?.contactPhone,
    currentRole: row.current_role ?? base?.currentRole,
    gender: (row.gender as FullProfessionalProfile["gender"]) ?? base?.gender,
    isVerified: row.is_verified ?? base?.isVerified ?? false,
    isPremium: row.is_premium ?? base?.isPremium ?? false,
    professionalScore: row.professional_score ?? base?.professionalScore ?? 0,
    hasFreelancerStore: base?.hasFreelancerStore ?? false,
    freelancerStoreSlug: base?.freelancerStoreSlug,
    showVisitStoreOnProfile: base?.showVisitStoreOnProfile,
    experiences: base?.experiences ?? [],
    education: base?.education ?? [],
    certifications: base?.certifications ?? [],
    skills: base?.skills ?? [],
    languages: base?.languages ?? [],
    projects: base?.projects ?? [],
  };

  merged.professionalScore =
    row.professional_score ??
    calculateProfessionalScore({
      profilePhotoUrl: merged.profilePhotoUrl,
      coverImageUrl: merged.coverImageUrl,
      headline: merged.headline,
      about: merged.about,
      resumeUrl: merged.resumeUrl,
      videoIntroUrl: merged.videoIntroUrl,
      verifiedExperienceCount: merged.experiences.filter((e) => e.isVerified).length,
      verifiedEducationCount: merged.education.filter((e) => e.isVerified).length,
      skillCount: merged.skills.length,
      certificationCount: merged.certifications.length,
    }).total;

  return merged;
}

async function fetchProfileRowByAccountId(accountId: string): Promise<DbProfileRow | null> {
  if (!isSupabasePersistenceEnabled()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("professional_profiles")
    .select(
      "id, account_id, slug, headline, about, profile_photo_url, cover_image_url, resume_url, video_intro_url, location, contact_email, full_name, gender, professional_score, is_verified, is_premium, website_url, contact_phone, current_role"
    )
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      markSupabaseDbSyncUnavailable("fetch profile", error);
    } else {
      console.error("[profile-persistence] fetch profile:", error.message);
    }
    return null;
  }
  return data as DbProfileRow | null;
}

async function fetchStoreRowByAccountId(accountId: string): Promise<DbStoreRow | null> {
  if (!isSupabasePersistenceEnabled()) return null;
  try {
    return await fetchStoreRowByAccountIdUnsafe(accountId);
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      console.error("[profile-persistence] fetch store:", String(error.message));
    }
    return null;
  }
}

function syncJsonFromDbProfile(row: DbProfileRow, storeRow?: DbStoreRow | null): void {
  syncJsonCacheFromSupabase({
    accountId: row.account_id,
    profileSlug: row.slug,
    profile: {
      fullName: row.full_name ?? undefined,
      headline: row.headline ?? undefined,
      about: row.about ?? undefined,
      profilePhotoUrl: row.profile_photo_url ?? undefined,
      coverImageUrl: row.cover_image_url ?? undefined,
      resumeUrl: row.resume_url ?? undefined,
      videoIntroUrl: row.video_intro_url ?? undefined,
      location: row.location ?? undefined,
      contactEmail: row.contact_email ?? undefined,
      websiteUrl: row.website_url ?? undefined,
      contactPhone: row.contact_phone ?? undefined,
      currentRole: row.current_role ?? undefined,
      gender: (row.gender as FullProfessionalProfile["gender"]) ?? undefined,
      isVerified: row.is_verified ?? undefined,
      isPremium: row.is_premium ?? undefined,
      professionalScore: row.professional_score ?? undefined,
    },
    store: storeRow
      ? {
          slug: storeRow.slug,
          storeName: storeRow.store_name,
          tagline: storeRow.tagline ?? undefined,
          description: storeRow.description ?? undefined,
          logoUrl: storeRow.logo_url ?? undefined,
          coverImageUrl: storeRow.cover_image_url ?? undefined,
          videoIntroUrl: storeRow.video_intro_url ?? undefined,
          seoSlug: storeRow.seo_slug ?? storeRow.slug,
          isVerified: storeRow.is_verified ?? undefined,
          isPremium: storeRow.is_premium ?? undefined,
          ratingAvg: storeRow.rating_avg ?? undefined,
          totalReviews: storeRow.total_reviews ?? undefined,
          viewCount: storeRow.view_count ?? undefined,
          conversionRate: storeRow.conversion_rate ?? undefined,
          professionalProfileSlug: row.slug,
        }
      : undefined,
  });
}

async function fetchProfileRowBySlug(slug: string): Promise<DbProfileRow | null> {
  if (!isSupabasePersistenceEnabled()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("professional_profiles")
    .select(
      "id, account_id, slug, headline, about, profile_photo_url, cover_image_url, resume_url, video_intro_url, location, contact_email, full_name, gender, professional_score, is_verified, is_premium, website_url, contact_phone, current_role"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      markSupabaseDbSyncUnavailable("fetch profile by slug", error);
    } else {
      console.error("[profile-persistence] fetch profile by slug:", error.message);
    }
    return null;
  }
  return data as DbProfileRow | null;
}

export async function upsertSupabaseProfile(
  accountId: string,
  profile: FullProfessionalProfile
): Promise<boolean> {
  if (!(await ensureDbReadyForSync())) return false;

  const admin = createAdminClient();
  const score = calculateProfessionalScore({
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

  const { error } = await admin.from("professional_profiles").upsert(
    {
      account_id: accountId,
      slug: profile.slug,
      full_name: profile.fullName,
      headline: profile.headline || null,
      about: profile.about || null,
      profile_photo_url: profile.profilePhotoUrl || null,
      cover_image_url: profile.coverImageUrl || null,
      resume_url: profile.resumeUrl || null,
      video_intro_url: profile.videoIntroUrl || null,
      location: profile.location || null,
      contact_email: profile.contactEmail || null,
      gender: profile.gender ?? null,
      website_url: profile.websiteUrl || null,
      contact_phone: profile.contactPhone || null,
      current_role: profile.currentRole || null,
      is_verified: profile.isVerified,
      is_premium: profile.isPremium,
      professional_score: score,
    },
    { onConflict: "account_id" }
  );

  if (error) {
    if (isMissingRelationError(error)) {
      markSupabaseDbSyncUnavailable("upsert profile", error);
    } else {
      console.error("[profile-persistence] upsert profile:", error.message);
    }
    return false;
  }

  return true;
}

export async function ensureSupabaseProfileAndStore(authUser: AuthUser): Promise<void> {
  if (!getProfileByAccountId(authUser.id)) {
    createProfileForAccount({
      accountId: authUser.id,
      fullName: authUser.fullName,
      email: authUser.email,
      role: authUser.role,
      gender: authUser.gender,
      hasFreelancerStore: authUser.hasFreelancerStore,
    });
  }

  await runOptionalDbSyncVoid("ensure profile and store", async () => {
    if (!(await ensureDbReadyForSync())) return;

    let profile = getProfileByAccountId(authUser.id);
    if (!profile) return;

    const existing = await fetchProfileRowByAccountId(authUser.id);
    if (existing && existing.slug !== profile.slug) {
      profile = updateProfileForAccount(authUser.id, { slug: existing.slug }) ?? profile;
    }

    await upsertSupabaseProfile(authUser.id, profile);

    if (authUser.hasFreelancerStore || getAccountLink(authUser.id)?.storeSlug) {
      ensureFreelancerStoreForAccount(authUser.id);
      await getStoreForAccount(authUser.id);
    }
  });
}

export async function loadProfileForAccount(accountId: string): Promise<FullProfessionalProfile | null> {
  let jsonProfile = getProfileByAccountId(accountId);
  const dbRow = await fetchProfileRowByAccountId(accountId);

  if (dbRow) {
    const storeRow = await fetchStoreRowByAccountId(accountId);
    syncJsonFromDbProfile(dbRow, storeRow);
    jsonProfile = getProfileByAccountId(accountId);
    const fromDb = mapDbProfileRow(dbRow, jsonProfile);
    if (jsonProfile) {
      return {
        ...jsonProfile,
        ...fromDb,
        experiences: jsonProfile.experiences,
        education: jsonProfile.education,
        certifications: jsonProfile.certifications,
        skills: jsonProfile.skills,
        languages: jsonProfile.languages,
        projects: jsonProfile.projects,
      };
    }
    return fromDb;
  }

  if (jsonProfile && isSupabasePersistenceEnabled()) {
    await upsertSupabaseProfile(accountId, jsonProfile);
  }

  return jsonProfile;
}

export async function loadProfileBySlug(slug: string): Promise<FullProfessionalProfile | null> {
  let jsonProfile = getProfileBySlug(slug);
  const dbRow = await fetchProfileRowBySlug(slug);

  if (dbRow) {
    const storeRow = await fetchStoreRowByAccountId(dbRow.account_id);
    syncJsonFromDbProfile(dbRow, storeRow);
    jsonProfile = getProfileBySlug(slug) ?? getProfileByAccountId(dbRow.account_id);
    const fromDb = mapDbProfileRow(dbRow, jsonProfile);
    if (jsonProfile) {
      return {
        ...jsonProfile,
        ...fromDb,
        experiences: jsonProfile.experiences,
        education: jsonProfile.education,
        certifications: jsonProfile.certifications,
        skills: jsonProfile.skills,
        languages: jsonProfile.languages,
        projects: jsonProfile.projects,
      };
    }
    return fromDb;
  }

  return jsonProfile;
}

export async function saveProfileForAccount(
  accountId: string,
  updates: Partial<FullProfessionalProfile>
): Promise<FullProfessionalProfile | null> {
  const profile = updateProfileForAccount(accountId, updates);
  if (!profile) return null;

  if (isSupabasePersistenceEnabled()) {
    await upsertSupabaseProfile(accountId, profile);
  }

  return profile;
}

export async function loadStoreForAccount(accountId: string) {
  return getStoreForAccount(accountId);
}

export async function loadStoreBySlug(slug: string) {
  return getStoreBySlugLive(slug);
}

export async function resolveAccountIdForStoreSlug(slug: string): Promise<string | null> {
  return resolveAccountIdForStoreSlugLive(slug);
}

export async function saveStoreForAccount(
  accountId: string,
  updates: Parameters<typeof updateStoreForAccountLive>[1]
) {
  return updateStoreForAccountLive(accountId, updates);
}

export async function resolveAccountIdForProfileSlug(slug: string): Promise<string | null> {
  return getAccountIdByProfileSlug(slug) ?? (await fetchProfileRowBySlug(slug))?.account_id ?? null;
}

export async function resolveUniqueProfileSlug(fullName: string, accountId: string): Promise<string> {
  const base = slugifyName(fullName) || "user";
  if (!(await ensureDbReadyForSync())) return base;

  const admin = createAdminClient();
  const { data, error } = await admin.from("professional_profiles").select("slug").ilike("slug", `${base}%`);
  if (error) {
    if (isMissingRelationError(error)) {
      markSupabaseDbSyncUnavailable("resolve profile slug", error);
    }
    return base;
  }
  const taken = new Set((data ?? []).map((row) => row.slug));
  return uniqueSlug(base, taken);
}
