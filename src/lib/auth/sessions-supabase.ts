import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserSession } from "@/types/security";

export interface DbUserSessionRow {
  id: string;
  account_id: string;
  session_token_hash: string;
  device_label: string | null;
  user_agent: string | null;
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  expires_at: string;
  created_at: string;
  last_active_at: string;
}

function mapRow(row: DbUserSessionRow, currentTokenHash?: string): UserSession {
  return {
    id: row.id,
    deviceLabel: row.device_label ?? "Unknown Device",
    userAgent: row.user_agent ?? "",
    ipAddress: row.ip_address ?? "unknown",
    location: row.location ?? "Saudi Arabia",
    isCurrent: currentTokenHash ? row.session_token_hash === currentTokenHash : row.is_current,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  };
}

export async function insertSessionInSupabase(input: {
  accountId: string;
  sessionTokenHash: string;
  deviceLabel: string;
  userAgent: string;
  ip: string;
  location: string;
  expiresAt: string;
}): Promise<UserSession> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("user_sessions")
    .update({ is_current: false })
    .eq("account_id", input.accountId)
    .eq("is_current", true);

  const { data, error } = await admin
    .from("user_sessions")
    .upsert(
      {
        account_id: input.accountId,
        session_token_hash: input.sessionTokenHash,
        device_label: input.deviceLabel,
        user_agent: input.userAgent,
        ip_address: input.ip,
        location: input.location,
        is_current: true,
        expires_at: input.expiresAt,
        last_active_at: now,
      },
      { onConflict: "session_token_hash" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as DbUserSessionRow, input.sessionTokenHash);
}

export async function listSessionsFromSupabase(
  accountId: string,
  currentTokenHash?: string
): Promise<UserSession[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin.from("user_sessions").delete().lt("expires_at", now);

  const { data, error } = await admin
    .from("user_sessions")
    .select("*")
    .eq("account_id", accountId)
    .gt("expires_at", now)
    .order("last_active_at", { ascending: false });

  if (error) throw error;
  return (data as DbUserSessionRow[]).map((row) => mapRow(row, currentTokenHash));
}

export async function revokeSessionInSupabase(
  accountId: string,
  sessionId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("account_id", accountId)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function revokeOtherSessionsInSupabase(
  accountId: string,
  currentTokenHash: string
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_sessions")
    .delete()
    .eq("account_id", accountId)
    .neq("session_token_hash", currentTokenHash)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function touchSessionInSupabase(
  accountId: string,
  sessionTokenHash: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("session_token_hash", sessionTokenHash);
  if (error) throw error;
}
