import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/types/notifications";

interface DbPrefsRow {
  account_id: string;
  global_enabled: boolean;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  category_settings: Partial<
    Record<NotificationCategory, { enabled: boolean; email: boolean; push: boolean }>
  > | null;
  updated_at: string;
}

export function mapDbPrefsToNotificationPreferences(row: DbPrefsRow): NotificationPreferences {
  const categorySettings = row.category_settings ?? {};
  const categories = { ...DEFAULT_NOTIFICATION_PREFERENCES.categories };

  for (const cat of Object.keys(categories) as NotificationCategory[]) {
    if (categorySettings[cat]) {
      categories[cat] = { ...categories[cat], ...categorySettings[cat] };
    }
  }

  return {
    globalEnabled: row.global_enabled,
    channels: {
      inApp: row.in_app_enabled,
      email: row.email_enabled,
      push: row.push_enabled,
    },
    categories,
  };
}

export function mapNotificationPreferencesToDb(
  accountId: string,
  prefs: NotificationPreferences
): Record<string, unknown> {
  return {
    account_id: accountId,
    global_enabled: prefs.globalEnabled,
    in_app_enabled: prefs.channels.inApp,
    email_enabled: prefs.channels.email,
    push_enabled: prefs.channels.push,
    category_settings: prefs.categories,
    updated_at: new Date().toISOString(),
  };
}

export async function loadNotificationPreferencesFromSupabase(
  accountId: string
): Promise<NotificationPreferences | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbPrefsToNotificationPreferences(data as DbPrefsRow);
}

export async function upsertNotificationPreferencesInSupabase(
  accountId: string,
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notification_preferences")
    .upsert(mapNotificationPreferencesToDb(accountId, prefs), { onConflict: "account_id" });
  if (error) throw error;
  return prefs;
}

export async function ensureNotificationPreferencesInSupabase(
  accountId: string
): Promise<NotificationPreferences> {
  const existing = await loadNotificationPreferencesFromSupabase(accountId);
  if (existing) return existing;
  return upsertNotificationPreferencesInSupabase(accountId, DEFAULT_NOTIFICATION_PREFERENCES);
}
