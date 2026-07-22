import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import type { FreelancerStore } from "@/types/freelance";

export interface DbStoreRow {
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
  is_premium: boolean | null;
  is_active: boolean | null;
}

export function mapStoreRow(row: DbStoreRow, base?: FreelancerStore | null): FreelancerStore {
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
    isPremium: row.is_premium ?? base?.isPremium ?? false,
    ratingAvg: Number(row.rating_avg ?? base?.ratingAvg ?? 0),
    totalReviews: row.total_reviews ?? base?.totalReviews ?? 0,
    viewCount: row.view_count ?? base?.viewCount ?? 0,
    conversionRate: Number(row.conversion_rate ?? base?.conversionRate ?? 0),
  };
}

const STORE_SELECT =
  "id, account_id, slug, store_name, tagline, description, logo_url, cover_image_url, video_intro_url, seo_slug, rating_avg, total_reviews, view_count, conversion_rate, is_verified, is_premium, is_active";

export async function listExistingStoreSlugs(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("freelancer_stores").select("slug");
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug as string));
}

export async function generateUniqueStoreSlug(name: string, extraSlugs?: Set<string>): Promise<string> {
  const base = slugifyName(name) || `store-${Date.now().toString(36)}`;
  const existing = await listExistingStoreSlugs();
  if (extraSlugs) {
    for (const slug of extraSlugs) existing.add(slug);
  }
  return uniqueSlug(base, existing);
}

export async function getStoreBySlugFromSupabase(slug: string): Promise<FreelancerStore | null> {
  const row = await fetchStoreRowBySlug(slug);
  if (!row) return null;
  return mapStoreRow(row);
}

export async function fetchStoreRowByAccountId(accountId: string): Promise<DbStoreRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelancer_stores")
    .select(STORE_SELECT)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbStoreRow | null) ?? null;
}

export async function fetchStoreRowBySlug(slug: string): Promise<DbStoreRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelancer_stores")
    .select(STORE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as DbStoreRow | null) ?? null;
}

export async function getStoreByAccountFromSupabase(
  accountId: string
): Promise<FreelancerStore | null> {
  const row = await fetchStoreRowByAccountId(accountId);
  if (!row) return null;
  return mapStoreRow(row);
}

export async function getStoreByIdFromSupabase(storeId: string): Promise<FreelancerStore | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelancer_stores")
    .select(STORE_SELECT)
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapStoreRow(data as DbStoreRow);
}

function mapStoreToUpsertRow(accountId: string, store: FreelancerStore): Record<string, unknown> {
  return {
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
    is_premium: store.isPremium ?? false,
    is_active: true,
  };
}

export async function upsertStoreInSupabase(
  accountId: string,
  store: FreelancerStore,
  profileSlug: string
): Promise<FreelancerStore> {
  const admin = createAdminClient();
  const { data: profileRow } = await admin
    .from("professional_profiles")
    .select("id")
    .eq("account_id", accountId)
    .maybeSingle();

  const { data, error } = await admin
    .from("freelancer_stores")
    .upsert(mapStoreToUpsertRow(accountId, store), { onConflict: "account_id" })
    .select(STORE_SELECT)
    .single();

  if (error) throw error;

  await admin.from("accounts").update({ has_freelancer_store: true }).eq("id", accountId);

  if (profileRow?.id && data?.id) {
    await admin.from("platform_links").upsert(
      {
        account_id: accountId,
        professional_profile_id: profileRow.id,
        freelancer_store_id: data.id,
      },
      { onConflict: "account_id" }
    );
  }

  const mapped = mapStoreRow(data as DbStoreRow, store);
  return { ...mapped, professionalProfileSlug: profileSlug || mapped.professionalProfileSlug };
}

export async function migrateJsonStoreToSupabase(input: {
  accountId: string;
  store: FreelancerStore;
  profileSlug: string;
}): Promise<FreelancerStore | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("freelancer_stores")
    .select("id")
    .eq("account_id", input.accountId)
    .maybeSingle();

  if (existing) return getStoreByAccountFromSupabase(input.accountId);

  const slug = await generateUniqueStoreSlug(input.store.storeName || input.store.slug);
  const storeToMigrate: FreelancerStore = {
    ...input.store,
    slug,
    seoSlug: input.store.seoSlug ?? slug,
  };

  return upsertStoreInSupabase(input.accountId, storeToMigrate, input.profileSlug);
}
