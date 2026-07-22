import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import { DEMO_SERVICES } from "@/lib/freelance/mock-data";
import {
  getServiceBySlugFromSupabase,
  listActiveMarketplaceServicesFromSupabase,
  listServicesByStoreFromSupabase,
  migrateJsonServicesToSupabase,
  replaceServicesForStoreInSupabase,
} from "@/lib/freelance/services-supabase";
import { getStoreForAccount, getStoreBySlugLive } from "@/lib/freelance/store-store";
import {
  getStoreServices,
  getStoreServicesForAccount,
  listAllMarketplaceServices,
  listLinkedAccounts,
  getAccountLink,
  saveStoreServicesForAccount,
} from "@/lib/profile/profile-store";
import type { MarketplaceService } from "@/types/freelance";

const MIGRATION_FLAG = "freelance-services-supabase-migrated.json";

let servicesTableProbed = false;
let servicesTableAvailable = false;

export async function isServicesSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (servicesTableProbed) return servicesTableAvailable;

  servicesTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelance_services").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelance_services missing", error);
      }
      servicesTableAvailable = false;
      return false;
    }
    servicesTableAvailable = true;
    return true;
  } catch {
    servicesTableAvailable = false;
    return false;
  }
}

function listJsonServicesForStoreSlug(storeSlug: string): MarketplaceService[] {
  const services = getStoreServices(storeSlug);
  if (services.length > 0) return services;
  return DEMO_SERVICES.filter((service) => service.storeSlug === storeSlug);
}

function listJsonMarketplaceServices(): MarketplaceService[] {
  const services = listAllMarketplaceServices();
  return services.length > 0 ? services : DEMO_SERVICES;
}

async function maybeMigrateJsonServicesToSupabase(): Promise<void> {
  if (!(await isServicesSupabaseReady())) return;

  const flag = readJsonStore<{ done?: boolean }>(MIGRATION_FLAG, () => ({ done: false }));
  if (flag.done) return;

  await runOptionalDbSyncVoid("freelance-services-json-migration", async () => {
    for (const accountId of listLinkedAccounts()) {
      const link = getAccountLink(accountId);
      if (!link?.storeSlug) continue;

      const store = await getStoreBySlugLive(link.storeSlug);
      const services = getStoreServices(link.storeSlug);
      if (store && services.length > 0) {
        await migrateJsonServicesToSupabase(store, services);
      }
    }
  });

  writeJsonStore(MIGRATION_FLAG, { done: true, migratedAt: new Date().toISOString() });
}

export async function listServicesForAccount(accountId: string): Promise<MarketplaceService[]> {
  const jsonFallback = getStoreServicesForAccount(accountId);
  const store = await getStoreForAccount(accountId);
  if (!store) return jsonFallback;

  if (!(await isServicesSupabaseReady())) {
    return jsonFallback.length > 0 ? jsonFallback : listJsonServicesForStoreSlug(store.slug);
  }

  await maybeMigrateJsonServicesToSupabase();

  return runOptionalDbSync(
    "listServicesForAccount",
    () =>
      listServicesByStoreFromSupabase(store.id, {
        id: store.id,
        slug: store.slug,
        storeName: store.storeName,
        logoUrl: store.logoUrl,
      }),
    jsonFallback.length > 0 ? jsonFallback : listJsonServicesForStoreSlug(store.slug)
  );
}

export async function listPublicServicesForStoreSlug(storeSlug: string): Promise<MarketplaceService[]> {
  const jsonFallback = listJsonServicesForStoreSlug(storeSlug).filter(
    (service) => service.title.trim().length > 0
  );
  const store = await getStoreBySlugLive(storeSlug);
  if (!store) return jsonFallback;

  if (!(await isServicesSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listPublicServicesForStoreSlug",
    () =>
      listServicesByStoreFromSupabase(
        store.id,
        {
          id: store.id,
          slug: store.slug,
          storeName: store.storeName,
          logoUrl: store.logoUrl,
        },
        { activeOnly: true }
      ),
    jsonFallback
  );
}

export async function listActiveMarketplaceServices(): Promise<MarketplaceService[]> {
  const jsonFallback = listJsonMarketplaceServices();

  if (!(await isServicesSupabaseReady())) {
    return jsonFallback;
  }

  await maybeMigrateJsonServicesToSupabase();

  return runOptionalDbSync(
    "listActiveMarketplaceServices",
    () => listActiveMarketplaceServicesFromSupabase(),
    jsonFallback
  );
}

export async function getMarketplaceServiceBySlug(slug: string): Promise<MarketplaceService | null> {
  const jsonFallback =
    listJsonMarketplaceServices().find((service) => service.slug === slug) ??
    DEMO_SERVICES.find((service) => service.slug === slug) ??
    null;

  if (!(await isServicesSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getMarketplaceServiceBySlug",
    () => getServiceBySlugFromSupabase(slug),
    jsonFallback
  );
}

export async function saveServicesForAccount(
  accountId: string,
  services: MarketplaceService[]
): Promise<MarketplaceService[] | null> {
  const jsonSaved = saveStoreServicesForAccount(accountId, services);
  if (!jsonSaved) return null;

  const store = await getStoreForAccount(accountId);
  if (!store) return jsonSaved;

  if (!(await isServicesSupabaseReady())) {
    return jsonSaved;
  }

  return runOptionalDbSync(
    "saveServicesForAccount",
    () => replaceServicesForStoreInSupabase(store, jsonSaved),
    jsonSaved
  );
}

export function isServicesPersistenceActive(): boolean {
  return servicesTableAvailable;
}
