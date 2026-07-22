import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AbuseSignal, AuditLogEntry, SecurityEventType, SecurityLogEntry } from "@/types/admin";

function mapSecurityEventType(value: string): SecurityEventType {
  if (value.includes("failed_login")) return "failed_login";
  if (value.includes("multi_device")) return "multi_device";
  if (value.includes("ip_anomaly")) return "ip_anomaly";
  if (value.includes("rate_limit")) return "rate_limit";
  return "failed_login";
}

function mapSeverity(value: string | null | undefined): SecurityLogEntry["severity"] {
  if (value === "high" || value === "critical") return "high";
  if (value === "medium" || value === "warn") return "medium";
  return "low";
}

function readDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function formatSignalType(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export interface AdminSecuritySnapshot {
  securityLog: SecurityLogEntry[];
  auditLog: AuditLogEntry[];
  abuseSignals: AbuseSignal[];
}

export async function getAdminSecuritySnapshotFromSupabase(): Promise<AdminSecuritySnapshot> {
  const admin = createAdminClient();

  const [securityRes, auditRes, abuseRes] = await Promise.all([
    admin
      .from("security_audit_log")
      .select("id, event_type, ip_address, details, severity, created_at, accounts(email, full_name)")
      .not("event_type", "ilike", "admin.%")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("security_audit_log")
      .select("id, event_type, details, created_at, accounts(full_name, email)")
      .ilike("event_type", "admin.%")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("abuse_signals")
      .select("id, signal_type, severity, details, created_at, accounts(full_name, email)")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (securityRes.error) throw securityRes.error;
  if (auditRes.error) throw auditRes.error;
  if (abuseRes.error) throw abuseRes.error;

  const securityLog: SecurityLogEntry[] = (securityRes.data ?? []).map((row) => {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    const details = readDetails(row.details);
    return {
      id: row.id as string,
      type: mapSecurityEventType(String(row.event_type)),
      userEmail: String(account?.email ?? details.email ?? "unknown@vora.sa"),
      ipAddress: String(row.ip_address ?? details.ipAddress ?? "—"),
      location: String(details.location ?? "Unknown"),
      details: String(details.message ?? details.details ?? row.event_type),
      timestamp: row.created_at as string,
      severity: mapSeverity(row.severity as string),
    };
  });

  const auditLog: AuditLogEntry[] = (auditRes.data ?? []).map((row) => {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    const details = readDetails(row.details);
    return {
      id: row.id as string,
      adminName: String(account?.full_name ?? account?.email ?? "Admin"),
      action: String(details.action ?? row.event_type),
      target: String(details.target ?? details.subject ?? "Platform"),
      timestamp: row.created_at as string,
    };
  });

  const abuseSignals: AbuseSignal[] = (abuseRes.data ?? []).map((row) => {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    const details = readDetails(row.details);
    return {
      id: row.id as string,
      userName: String(account?.full_name ?? account?.email ?? "Unknown user"),
      signalType: formatSignalType(String(row.signal_type)),
      count: Number(details.count ?? 1),
      threshold: Number(details.threshold ?? 5),
      timestamp: row.created_at as string,
    };
  });

  return { securityLog, auditLog, abuseSignals };
}
