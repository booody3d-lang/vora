import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "@/types/notifications";
import {
  ensureNotificationPreferencesInSupabase,
  loadNotificationPreferencesFromSupabase,
  upsertNotificationPreferencesInSupabase,
} from "@/lib/notifications/notification-preferences-supabase";

const prefsCache = new Map<string, NotificationPreferences>();
let prefsTableProbed = false;
let prefsTableAvailable = false;

async function isNotificationPrefsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (prefsTableProbed) return prefsTableAvailable;

  prefsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notification_preferences").select("account_id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("notification_preferences missing", error);
      }
      prefsTableAvailable = false;
      return false;
    }
    prefsTableAvailable = true;
    return true;
  } catch {
    prefsTableAvailable = false;
    return false;
  }
}

export async function getNotificationPreferences(accountId: string): Promise<NotificationPreferences> {
  const cached = prefsCache.get(accountId);
  if (cached) return cached;

  if (!(await isNotificationPrefsSupabaseReady())) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const prefs = await runOptionalDbSync(
    "getNotificationPreferences",
    async () => {
      const loaded = await loadNotificationPreferencesFromSupabase(accountId);
      if (loaded) return loaded;
      return ensureNotificationPreferencesInSupabase(accountId);
    },
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  prefsCache.set(accountId, prefs);
  return prefs;
}

export async function updateNotificationPreferences(
  accountId: string,
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  prefsCache.set(accountId, prefs);

  if (!(await isNotificationPrefsSupabaseReady())) {
    return prefs;
  }

  await runOptionalDbSync(
    "updateNotificationPreferences",
    async () => upsertNotificationPreferencesInSupabase(accountId, prefs),
    prefs
  );

  return prefs;
}

export function isNotificationPrefsPersistenceActive(): boolean {
  return prefsTableAvailable;
}
