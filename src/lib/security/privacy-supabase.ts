import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from "@/types/security";

interface DbPrivacyRow {
  account_id: string;
  profile_visibility: PrivacySettings["profileVisibility"];
  hide_email: boolean;
  hide_phone: boolean;
  hide_contact_info: boolean;
  feed_activity_visible: boolean;
  allow_search_indexing: boolean;
  data_processing_consent: boolean;
  marketing_consent: boolean;
  updated_at: string;
}

function mapDbPrivacyToSettings(row: DbPrivacyRow): PrivacySettings {
  return {
    profileVisibility: row.profile_visibility,
    hideEmail: row.hide_email,
    hidePhone: row.hide_phone,
    hideContactInfo: row.hide_contact_info,
    feedActivityVisible: row.feed_activity_visible,
    allowSearchIndexing: row.allow_search_indexing,
    dataProcessingConsent: row.data_processing_consent,
    marketingConsent: row.marketing_consent,
  };
}

function mapPrivacySettingsToDb(
  accountId: string,
  settings: PrivacySettings
): Record<string, unknown> {
  return {
    account_id: accountId,
    profile_visibility: settings.profileVisibility,
    hide_email: settings.hideEmail,
    hide_phone: settings.hidePhone,
    hide_contact_info: settings.hideContactInfo,
    feed_activity_visible: settings.feedActivityVisible,
    allow_search_indexing: settings.allowSearchIndexing,
    data_processing_consent: settings.dataProcessingConsent,
    marketing_consent: settings.marketingConsent,
    updated_at: new Date().toISOString(),
  };
}

export async function loadPrivacySettingsFromSupabase(
  accountId: string
): Promise<PrivacySettings | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("privacy_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbPrivacyToSettings(data as DbPrivacyRow);
}

export async function upsertPrivacySettingsInSupabase(
  accountId: string,
  settings: PrivacySettings
): Promise<PrivacySettings> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("privacy_settings")
    .upsert(mapPrivacySettingsToDb(accountId, settings), { onConflict: "account_id" });
  if (error) throw error;
  return settings;
}

export async function ensurePrivacySettingsInSupabase(
  accountId: string
): Promise<PrivacySettings> {
  const existing = await loadPrivacySettingsFromSupabase(accountId);
  if (existing) return existing;
  return upsertPrivacySettingsInSupabase(accountId, DEFAULT_PRIVACY_SETTINGS);
}

export async function queueDataDeletionRequest(
  accountId: string,
  reason?: string
): Promise<{ scheduledAt: string }> {
  const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("data_deletion_requests").insert({
    account_id: accountId,
    reason: reason ?? null,
    status: "pending",
    scheduled_deletion_at: scheduledAt,
  });
  if (error) throw error;
  return { scheduledAt };
}
