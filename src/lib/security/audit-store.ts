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
import {
  insertAuditEventInSupabase,
  listAuditEventsFromSupabase,
} from "@/lib/security/audit-supabase";
import type { SecurityAuditAction, SecurityAuditEvent } from "@/types/security";

const AUDIT_FILE = "security-audit.json";
const MAX_JSON_RECORDS = 500;

interface JsonAuditRecord {
  id: string;
  accountId: string | null;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  severity: string;
  createdAt: string;
}

interface AuditDataFile {
  records: JsonAuditRecord[];
}

export interface WriteSecurityAuditInput {
  accountId: string | null;
  action: SecurityAuditAction | string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warn" | "medium" | "high";
}

let auditTableProbed = false;
let auditTableAvailable = false;

function readAuditData(): AuditDataFile {
  return readJsonStore(AUDIT_FILE, () => ({ records: [] }));
}

function writeAuditData(data: AuditDataFile) {
  writeJsonStore(AUDIT_FILE, data);
}

function mapJsonRecord(record: JsonAuditRecord): SecurityAuditEvent {
  return {
    id: record.id,
    action: record.action,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    metadata: record.metadata,
    severity: record.severity,
    createdAt: record.createdAt,
  };
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/secret|token|password|hash|code|totp/i.test(key)) continue;
    if (typeof value === "string" && value.length > 200) {
      safe[key] = `${value.slice(0, 200)}…`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function saveJsonAuditEvent(input: WriteSecurityAuditInput): SecurityAuditEvent {
  const data = readAuditData();
  const record: JsonAuditRecord = {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    action: input.action,
    ipAddress: input.ip,
    userAgent: input.userAgent,
    metadata: sanitizeMetadata(input.metadata),
    severity: input.severity ?? "info",
    createdAt: new Date().toISOString(),
  };
  data.records.unshift(record);
  if (data.records.length > MAX_JSON_RECORDS) {
    data.records = data.records.slice(0, MAX_JSON_RECORDS);
  }
  writeAuditData(data);
  return mapJsonRecord(record);
}

function listJsonAuditEvents(accountId: string, limit: number): SecurityAuditEvent[] {
  const data = readAuditData();
  return data.records
    .filter((record) => record.accountId === accountId)
    .slice(0, limit)
    .map(mapJsonRecord);
}

export async function isAuditSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (auditTableProbed) return auditTableAvailable;

  auditTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("security_audit_log").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("security_audit_log missing", error);
      }
      auditTableAvailable = false;
      return false;
    }
    auditTableAvailable = true;
    return true;
  } catch {
    auditTableAvailable = false;
    return false;
  }
}

export function getRequestAuditContext(request: Request): { ip: string; userAgent: string } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}

export async function writeSecurityAuditEvent(input: WriteSecurityAuditInput): Promise<void> {
  const sanitized: WriteSecurityAuditInput = {
    ...input,
    metadata: sanitizeMetadata(input.metadata),
  };

  const jsonEvent = saveJsonAuditEvent(sanitized);

  if (!(await isAuditSupabaseReady())) return;

  await runOptionalDbSyncVoid("writeSecurityAuditEvent", () =>
    insertAuditEventInSupabase({
      accountId: sanitized.accountId,
      eventType: sanitized.action,
      ipAddress: sanitized.ip,
      userAgent: sanitized.userAgent,
      details: sanitized.metadata,
      severity: sanitized.severity ?? "info",
    }).then(() => undefined)
  );

  void jsonEvent;
}

export async function listSecurityAuditEvents(
  accountId: string,
  limit = 30
): Promise<SecurityAuditEvent[]> {
  const jsonEvents = listJsonAuditEvents(accountId, limit);

  if (!(await isAuditSupabaseReady())) {
    return jsonEvents;
  }

  return runOptionalDbSync(
    "listSecurityAuditEvents",
    () => listAuditEventsFromSupabase(accountId, limit),
    jsonEvents
  );
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}
