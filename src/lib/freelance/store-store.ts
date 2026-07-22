import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import { DEMO_PORTFOLIO, DEMO_STORE } from "@/lib/freelance/mock-data";
import {
  listPortfolioByStoreFromSupabase,
  replacePortfolioForStoreInSupabase,
} from "@/lib/freelance/portfolio-supabase";
import {
  fetchStoreRowByAccountId,
  fetchStoreRowBySlug,
  mapStoreRow,
  migrateJsonStoreToSupabase,
  upsertStoreInSupabase,
  type DbStoreRow,
} from "@/lib/freelance/store-supabase";
import {
  ensureFreelancerStoreForAccount,
  getAccountIdByStoreSlug,
  getAccountLink,
  getProfileByAccountId,
  getStoreByAccountId,
  getStoreBySlug,
  listLinkedAccounts,
  syncJsonCacheFromSupabase,
  updateStoreForAccount,
} from "@/lib/profile/profile-store";
import type { FreelancerStore, PortfolioItem } from "@/types/freelance";

const PORTFOLIO_FILE = "freelance-portfolios.json";
const MIGRATION_FLAG = "freelance-store-supabase-migrated.json";

interface PortfolioDataFile {
  byStoreSlug: Record<string, PortfolioItem[]>;
}

let storeTableProbed = false;
let storeTableAvailable = false;

export async function isStoreSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (storeTableProbed) return storeTableAvailable;

  storeTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelancer_stores").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelancer_stores missing", error);
      }
      storeTableAvailable = false;
      return false;
    }
    storeTableAvailable = true;
    return true;
  } catch {
    storeTableAvailable = false;
    return false;
  }
}

function readPortfolioData(): PortfolioDataFile {
  const data = readJsonStore(PORTFOLIO_FILE, () => ({
    byStoreSlug: {} as Record<string, PortfolioItem[]>,
  }));
  if (!data.byStoreSlug) data.byStoreSlug = {};
  return data;
}

function writePortfolioData(data: PortfolioDataFile) {
  writeJsonStore(PORTFOLIO_FILE, data);
}

function listPortfolioFromJson(storeSlug: string): PortfolioItem[] {
  const items = readPortfolioData().byStoreSlug[storeSlug] ?? [];
  if (items.length > 0) return items;
  if (storeSlug === DEMO_STORE.slug) return DEMO_PORTFOLIO;
  return [];
}

function savePortfolioToJson(storeSlug: string, items: PortfolioItem[]) {
  const data = readPortfolioData();
  data.byStoreSlug[storeSlug] = items;
  writePortfolioData(data);
}

async function maybeMigrateJsonStoreToSupabase(): Promise<void> {
  if (!(await isStoreSupabaseReady())) return;

  const flag = readJsonStore<{ done?: boolean }>(MIGRATION_FLAG, () => ({ done: false }));
  if (flag.done) return;

  await runOptionalDbSyncVoid("freelance-store-json-migration", async () => {
    for (const accountId of listLinkedAccounts()) {
      const link = getAccountLink(accountId);
      const store = getStoreByAccountId(accountId);
      const profileSlug = link?.profileSlug ?? getProfileByAccountId(accountId)?.slug ?? "";
      if (store && profileSlug) {
        await migrateJsonStoreToSupabase({ accountId, store, profileSlug });
      }
    }
  });

  writeJsonStore(MIGRATION_FLAG, { done: true, migratedAt: new Date().toISOString() });
}

function syncStoreJsonFromDbRow(row: DbStoreRow): void {
  const profile = getProfileByAccountId(row.account_id);
  syncJsonCacheFromSupabase({
    accountId: row.account_id,
    profileSlug: profile?.slug ?? row.slug,
    profile: profile
      ? {
          fullName: profile.fullName,
          headline: profile.headline,
          about: profile.about,
        }
      : {},
    store: {
      slug: row.slug,
      storeName: row.store_name,
      tagline: row.tagline ?? undefined,
      description: row.description ?? undefined,
      logoUrl: row.logo_url ?? undefined,
      coverImageUrl: row.cover_image_url ?? undefined,
      videoIntroUrl: row.video_intro_url ?? undefined,
      seoSlug: row.seo_slug ?? row.slug,
      isVerified: row.is_verified ?? undefined,
      isPremium: row.is_premium ?? undefined,
      ratingAvg: row.rating_avg ?? undefined,
      totalReviews: row.total_reviews ?? undefined,
      viewCount: row.view_count ?? undefined,
      conversionRate: row.conversion_rate ?? undefined,
      professionalProfileSlug: profile?.slug,
    },
  });
}

export async function ensureStoreForAccount(accountId: string): Promise<FreelancerStore | null> {
  ensureFreelancerStoreForAccount(accountId);
  return getStoreForAccount(accountId);
}

export async function getStoreForAccount(accountId: string): Promise<FreelancerStore | null> {
  ensureFreelancerStoreForAccount(accountId);
  const jsonFallback = getStoreByAccountId(accountId);
  const profileSlug = getProfileByAccountId(accountId)?.slug ?? "";

  if (!(await isStoreSupabaseReady())) {
    return jsonFallback;
  }

  await maybeMigrateJsonStoreToSupabase();

  return runOptionalDbSync(
    "getStoreForAccount",
    async () => {
      const row = await fetchStoreRowByAccountId(accountId);
      if (!row) {
        if (jsonFallback && profileSlug) {
          return upsertStoreInSupabase(accountId, jsonFallback, profileSlug);
        }
        return null;
      }

      syncStoreJsonFromDbRow(row);
      const store = mapStoreRow(row, jsonFallback ?? undefined);
      return {
        ...store,
        professionalProfileSlug: profileSlug || store.professionalProfileSlug,
      };
    },
    jsonFallback
  );
}

export async function getStoreBySlugLive(slug: string): Promise<FreelancerStore | null> {
  const jsonFallback = getStoreBySlug(slug) ?? (slug === DEMO_STORE.slug ? DEMO_STORE : null);

  if (!(await isStoreSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getStoreBySlugLive",
    async () => {
      const row = await fetchStoreRowBySlug(slug);
      if (!row) return jsonFallback;

      syncStoreJsonFromDbRow(row);
      const store = mapStoreRow(row, jsonFallback ?? undefined);
      const profile = getProfileByAccountId(row.account_id);
      return {
        ...store,
        professionalProfileSlug: profile?.slug ?? store.professionalProfileSlug,
      };
    },
    jsonFallback
  );
}

export async function updateStoreForAccountLive(
  accountId: string,
  updates: Partial<FreelancerStore>
): Promise<FreelancerStore | null> {
  ensureFreelancerStoreForAccount(accountId);
  const store = updateStoreForAccount(accountId, updates);
  if (!store) return null;

  const profileSlug = getProfileByAccountId(accountId)?.slug ?? "";

  if (!(await isStoreSupabaseReady())) {
    return store;
  }

  return runOptionalDbSync(
    "updateStoreForAccountLive",
    () => upsertStoreInSupabase(accountId, store, profileSlug),
    store
  );
}

export async function resolveAccountIdForStoreSlugLive(slug: string): Promise<string | null> {
  const jsonAccountId = getAccountIdByStoreSlug(slug);

  if (!(await isStoreSupabaseReady())) {
    return jsonAccountId;
  }

  return runOptionalDbSync(
    "resolveAccountIdForStoreSlugLive",
    async () => {
      const row = await fetchStoreRowBySlug(slug);
      return row?.account_id ?? jsonAccountId;
    },
    jsonAccountId
  );
}

export async function listPortfolioForStoreSlug(storeSlug: string): Promise<PortfolioItem[]> {
  const jsonFallback = listPortfolioFromJson(storeSlug);
  const store = await getStoreBySlugLive(storeSlug);

  if (!store || !(await isStoreSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listPortfolioForStoreSlug",
    () => listPortfolioByStoreFromSupabase(store.id),
    jsonFallback
  );
}

export async function savePortfolioForAccount(
  accountId: string,
  items: PortfolioItem[]
): Promise<PortfolioItem[] | null> {
  const store = await getStoreForAccount(accountId);
  if (!store) return null;

  savePortfolioToJson(store.slug, items);
  const jsonSaved = listPortfolioFromJson(store.slug);

  if (!(await isStoreSupabaseReady())) {
    return jsonSaved;
  }

  return runOptionalDbSync(
    "savePortfolioForAccount",
    () => replacePortfolioForStoreInSupabase(store.id, items),
    jsonSaved
  );
}

export function isStorePersistenceActive(): boolean {
  return storeTableAvailable;
}
