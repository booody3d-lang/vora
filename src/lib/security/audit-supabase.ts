import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SecurityAuditEvent } from "@/types/security";

export interface InsertAuditRowInput {
  accountId: string | null;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity?: string;
}

function mapRow(row: {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: unknown;
  severity: string;
  created_at: string;
}): SecurityAuditEvent {
  const details =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    action: row.event_type,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    metadata: details,
    severity: row.severity,
    createdAt: row.created_at,
  };
}

export async function insertAuditEventInSupabase(input: InsertAuditRowInput): Promise<SecurityAuditEvent> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("security_audit_log")
    .insert({
      account_id: input.accountId,
      event_type: input.eventType,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      details: input.details ?? {},
      severity: input.severity ?? "info",
    })
    .select("id, event_type, ip_address, user_agent, details, severity, created_at")
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function listAuditEventsFromSupabase(
  accountId: string,
  limit = 30
): Promise<SecurityAuditEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("security_audit_log")
    .select("id, event_type, ip_address, user_agent, details, severity, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}
