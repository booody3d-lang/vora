import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ensureFreelancerStoreForAccount,
  getAccountIdByProfileSlug,
  getAccountIdByStoreSlug,
  getAccountLink,
  getProfileByAccountId,
  getProfileBySlug,
  getStoreByAccountId,
  getStoreBySlug,
  syncJsonCacheFromSupabase,
  updateProfileForAccount,
  updateStoreForAccount,
  createProfileForAccount,
} from "@/lib/profile/profile-store";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import { calculateProfessionalScore } from "@/lib/professional-score/calculator";
import type { FreelancerStore } from "@/types/freelance";
import type { FullProfessionalProfile } from "@/types/network";
import type { AuthUser } from "@/types/security";

export function isSupabasePersistenceEnabled(): boolean {
  return isSupabaseConfigured() && isAdminClientAvailable();
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

interface DbStoreRow {
  id: string;
  account_id: string;
  slug: string;
  store_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  video_intro_url: string | null;
  seo_slug: string | null;
  rating_avg: number | null;
  total_reviews: number | null;
  view_count: number | null;
  conversion_rate: number | null;
  is_verified: boolean | null;
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

function mapDbStoreRow(row: DbStoreRow, base?: FreelancerStore | null): FreelancerStore {
  return {
    id: row.id,
    slug: row.slug,
    seoSlug: row.seo_slug ?? row.slug,
    storeName: row.store_name,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    logoUrl: row.logo_url ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    videoIntroUrl: row.video_intro_url ?? base?.videoIntroUrl,
    professionalProfileSlug: base?.professionalProfileSlug ?? "",
    isVerified: row.is_verified ?? base?.isVerified ?? false,
    ratingAvg: Number(row.rating_avg ?? base?.ratingAvg ?? 0),
    totalReviews: row.total_reviews ?? base?.totalReviews ?? 0,
    viewCount: row.view_count ?? base?.viewCount ?? 0,
    conversionRate: Number(row.conversion_rate ?? base?.conversionRate ?? 0),
  };
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
    console.error("[profile-persistence] fetch profile:", error.message);
    return null;
  }
  return data as DbProfileRow | null;
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
    console.error("[profile-persistence] fetch profile by slug:", error.message);
    return null;
  }
  return data as DbProfileRow | null;
}

async function fetchStoreRowByAccountId(accountId: string): Promise<DbStoreRow | null> {
  if (!isSupabasePersistenceEnabled()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelancer_stores")
    .select(
      "id, account_id, slug, store_name, tagline, description, logo_url, cover_image_url, video_intro_url, seo_slug, rating_avg, total_reviews, view_count, conversion_rate, is_verified"
    )
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) {
    console.error("[profile-persistence] fetch store:", error.message);
    return null;
  }
  return data as DbStoreRow | null;
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
          ratingAvg: storeRow.rating_avg ?? undefined,
          totalReviews: storeRow.total_reviews ?? undefined,
          viewCount: storeRow.view_count ?? undefined,
          conversionRate: storeRow.conversion_rate ?? undefined,
          professionalProfileSlug: row.slug,
        }
      : undefined,
  });
}

async function fetchStoreRowBySlug(slug: string): Promise<DbStoreRow | null> {
  if (!isSupabasePersistenceEnabled()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelancer_stores")
    .select(
      "id, account_id, slug, store_name, tagline, description, logo_url, cover_image_url, video_intro_url, seo_slug, rating_avg, total_reviews, view_count, conversion_rate, is_verified"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[profile-persistence] fetch store by slug:", error.message);
    return null;
  }
  return data as DbStoreRow | null;
}

export async function upsertSupabaseProfile(
  accountId: string,
  profile: FullProfessionalProfile
): Promise<void> {
  if (!isSupabasePersistenceEnabled()) return;

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
    console.error("[profile-persistence] upsert profile:", error.message);
    throw new Error(error.message);
  }
}

export async function upsertSupabaseStore(
  accountId: string,
  store: FreelancerStore,
  profileSlug: string
): Promise<void> {
  if (!isSupabasePersistenceEnabled()) return;

  const admin = createAdminClient();
  const { data: profileRow } = await admin
    .from("professional_profiles")
    .select("id")
    .eq("account_id", accountId)
    .maybeSingle();

  const { data: storeRow, error } = await admin
    .from("freelancer_stores")
    .upsert(
      {
        account_id: accountId,
        slug: store.slug,
        seo_slug: store.seoSlug ?? store.slug,
        store_name: store.storeName,
        tagline: store.tagline || null,
        description: store.description || null,
        logo_url: store.logoUrl || null,
        cover_image_url: store.coverImageUrl || null,
        video_intro_url: store.videoIntroUrl || null,
        rating_avg: store.ratingAvg ?? 0,
        total_reviews: store.totalReviews ?? 0,
        view_count: store.viewCount ?? 0,
        conversion_rate: store.conversionRate ?? 0,
        is_verified: store.isVerified ?? false,
        is_active: true,
      },
      { onConflict: "account_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[profile-persistence] upsert store:", error.message);
    throw new Error(error.message);
  }

  await admin.from("accounts").update({ has_freelancer_store: true }).eq("id", accountId);

  if (profileRow?.id && storeRow?.id) {
    await admin.from("platform_links").upsert(
      {
        account_id: accountId,
        professional_profile_id: profileRow.id,
        freelancer_store_id: storeRow.id,
      },
      { onConflict: "account_id" }
    );
  }
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

  if (!isSupabasePersistenceEnabled()) return;

  let profile = getProfileByAccountId(authUser.id);
  if (!profile) return;

  const existing = await fetchProfileRowByAccountId(authUser.id);
  if (existing && existing.slug !== profile.slug) {
    profile = updateProfileForAccount(authUser.id, { slug: existing.slug }) ?? profile;
  }

  await upsertSupabaseProfile(authUser.id, profile);

  if (authUser.hasFreelancerStore || getAccountLink(authUser.id)?.storeSlug) {
    ensureFreelancerStoreForAccount(authUser.id);
    const store = getStoreByAccountId(authUser.id);
    if (store) {
      await upsertSupabaseStore(authUser.id, store, profile.slug);
    }
  }
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
    await upsertSupabaseProfile(accountId, jsonProfile).catch(console.error);
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

export async function loadStoreForAccount(accountId: string): Promise<FreelancerStore | null> {
  ensureFreelancerStoreForAccount(accountId);
  let jsonStore = getStoreByAccountId(accountId);
  const dbRow = await fetchStoreRowByAccountId(accountId);
  const profileSlug = getProfileByAccountId(accountId)?.slug ?? "";

  if (dbRow) {
    const profileRow = await fetchProfileRowByAccountId(accountId);
    if (profileRow) {
      syncJsonFromDbProfile(profileRow, dbRow);
    }
    jsonStore = getStoreByAccountId(accountId);
    const fromDb = mapDbStoreRow(dbRow, jsonStore);
    return { ...fromDb, professionalProfileSlug: profileSlug || fromDb.professionalProfileSlug };
  }

  if (jsonStore && isSupabasePersistenceEnabled() && profileSlug) {
    await upsertSupabaseStore(accountId, jsonStore, profileSlug).catch(console.error);
  }

  return jsonStore;
}

export async function loadStoreBySlug(slug: string): Promise<FreelancerStore | null> {
  let jsonStore = getStoreBySlug(slug);
  const dbRow = await fetchStoreRowBySlug(slug);

  if (dbRow) {
    const profileRow = await fetchProfileRowByAccountId(dbRow.account_id);
    if (profileRow) {
      syncJsonFromDbProfile(profileRow, dbRow);
    }
    jsonStore = getStoreBySlug(slug);
    return mapDbStoreRow(dbRow, jsonStore);
  }

  return jsonStore;
}

export async function resolveAccountIdForStoreSlug(slug: string): Promise<string | null> {
  return getAccountIdByStoreSlug(slug) ?? (await fetchStoreRowBySlug(slug))?.account_id ?? null;
}

export async function resolveAccountIdForProfileSlug(slug: string): Promise<string | null> {
  return getAccountIdByProfileSlug(slug) ?? (await fetchProfileRowBySlug(slug))?.account_id ?? null;
}

export async function saveStoreForAccount(
  accountId: string,
  updates: Partial<FreelancerStore>
): Promise<FreelancerStore | null> {
  ensureFreelancerStoreForAccount(accountId);
  const store = updateStoreForAccount(accountId, updates);
  if (!store) return null;

  const profile = getProfileByAccountId(accountId);
  if (isSupabasePersistenceEnabled() && profile) {
    await upsertSupabaseStore(accountId, store, profile.slug);
  }

  return store;
}

export async function resolveUniqueProfileSlug(fullName: string, accountId: string): Promise<string> {
  const base = slugifyName(fullName) || "user";
  if (!isSupabasePersistenceEnabled()) return base;

  const admin = createAdminClient();
  const { data } = await admin.from("professional_profiles").select("slug").ilike("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug));
  return uniqueSlug(base, taken);
}
