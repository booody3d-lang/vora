import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { listCompaniesForAdmin } from "@/lib/admin/admin-companies-store";
import {
  archiveServiceInSupabase,
  archiveStoreInSupabase,
  listCompaniesForModerationFromSupabase,
  listServicesForModerationFromSupabase,
  listStoresForModerationFromSupabase,
  setServiceHiddenInSupabase,
  setStoreHiddenInSupabase,
} from "@/lib/admin/admin-moderation-supabase";
import {
  ADMIN_MODERATION_SERVICES,
  ADMIN_MODERATION_STORES,
} from "@/lib/admin/mock-data";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import type { ModerationCompany, ModerationService, ModerationStore } from "@/types/admin";

const MODERATION_FILE = "admin-moderation.json";

interface ModerationDataFile {
  stores: ModerationStore[];
  services: ModerationService[];
}

let moderationTableProbed = false;
let moderationTableAvailable = false;

export async function isAdminModerationSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (moderationTableProbed) return moderationTableAvailable;

  moderationTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelancer_stores").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelancer_stores missing", error);
      }
      moderationTableAvailable = false;
      return false;
    }
    moderationTableAvailable = true;
    return true;
  } catch {
    moderationTableAvailable = false;
    return false;
  }
}

function readModerationData(): ModerationDataFile {
  return readJsonStore(MODERATION_FILE, () => ({
    stores: ADMIN_MODERATION_STORES,
    services: ADMIN_MODERATION_SERVICES,
  }));
}

function writeModerationData(data: ModerationDataFile) {
  writeJsonStore(MODERATION_FILE, data);
}

export interface AdminModerationSnapshot {
  stores: ModerationStore[];
  services: ModerationService[];
  companies: ModerationCompany[];
  persistence: "supabase" | "json" | "mixed";
}

export async function getAdminModerationSnapshot(): Promise<AdminModerationSnapshot> {
  const jsonData = readModerationData();
  const storesReady = await isAdminModerationSupabaseReady();

  const [stores, services, companies] = await Promise.all([
    storesReady
      ? runOptionalDbSync(
          "listStoresForModeration",
          () => listStoresForModerationFromSupabase(),
          jsonData.stores
        )
      : Promise.resolve(jsonData.stores),
    storesReady
      ? runOptionalDbSync(
          "listServicesForModeration",
          () => listServicesForModerationFromSupabase(),
          jsonData.services
        )
      : Promise.resolve(jsonData.services),
    listCompaniesForAdmin().then((demoCompanies) =>
      storesReady
        ? runOptionalDbSync(
            "listCompaniesForModeration",
            () => listCompaniesForModerationFromSupabase(),
            demoCompanies
          )
        : demoCompanies
    ),
  ]);

  const usesSupabase = storesReady;
  return {
    stores,
    services,
    companies,
    persistence: usesSupabase ? "supabase" : "json",
  };
}

export async function toggleStoreHiddenForAdmin(
  storeId: string,
  isHidden: boolean
): Promise<ModerationStore | null> {
  const data = readModerationData();
  const index = data.stores.findIndex((store) => store.id === storeId);
  if (index >= 0) {
    data.stores[index] = { ...data.stores[index], isHidden };
    writeModerationData(data);
  }

  if (!(await isAdminModerationSupabaseReady()) || !isValidBillingUuid(storeId)) {
    return index >= 0 ? data.stores[index] : null;
  }

  return runOptionalDbSync(
    "toggleStoreHiddenForAdmin",
    () => setStoreHiddenInSupabase(storeId, isHidden),
    index >= 0 ? data.stores[index] : null
  );
}

export async function toggleServiceHiddenForAdmin(
  serviceId: string,
  isHidden: boolean
): Promise<ModerationService | null> {
  const data = readModerationData();
  const index = data.services.findIndex((service) => service.id === serviceId);
  if (index >= 0) {
    data.services[index] = { ...data.services[index], isHidden };
    writeModerationData(data);
  }

  if (!(await isAdminModerationSupabaseReady()) || !isValidBillingUuid(serviceId)) {
    return index >= 0 ? data.services[index] : null;
  }

  return runOptionalDbSync(
    "toggleServiceHiddenForAdmin",
    () => setServiceHiddenInSupabase(serviceId, isHidden),
    index >= 0 ? data.services[index] : null
  );
}

export async function removeStoreForAdmin(storeId: string): Promise<ModerationStore | null> {
  const data = readModerationData();
  const index = data.stores.findIndex((store) => store.id === storeId);
  if (index >= 0) {
    data.stores[index] = { ...data.stores[index], isHidden: true };
    writeModerationData(data);
  }

  if (!(await isAdminModerationSupabaseReady()) || !isValidBillingUuid(storeId)) {
    return index >= 0 ? data.stores[index] : null;
  }

  return runOptionalDbSync(
    "removeStoreForAdmin",
    () => archiveStoreInSupabase(storeId),
    index >= 0 ? data.stores[index] : null
  );
}

export async function removeServiceForAdmin(serviceId: string): Promise<ModerationService | null> {
  const data = readModerationData();
  const index = data.services.findIndex((service) => service.id === serviceId);
  if (index >= 0) {
    data.services[index] = { ...data.services[index], isHidden: true };
    writeModerationData(data);
  }

  if (!(await isAdminModerationSupabaseReady()) || !isValidBillingUuid(serviceId)) {
    return index >= 0 ? data.services[index] : null;
  }

  return runOptionalDbSync(
    "removeServiceForAdmin",
    () => archiveServiceInSupabase(serviceId),
    index >= 0 ? data.services[index] : null
  );
}

export function isAdminModerationPersistenceActive(): boolean {
  return moderationTableAvailable;
}
