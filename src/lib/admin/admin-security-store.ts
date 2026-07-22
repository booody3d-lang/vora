import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_ABUSE_SIGNALS,
  ADMIN_AUDIT_LOG,
  ADMIN_SECURITY_LOG,
} from "@/lib/admin/mock-data";
import {
  getAdminSecuritySnapshotFromSupabase,
  type AdminSecuritySnapshot,
} from "@/lib/admin/admin-security-supabase";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";

let securityTableProbed = false;
let securityTableAvailable = false;

const DEMO_SECURITY_SNAPSHOT: AdminSecuritySnapshot = {
  securityLog: ADMIN_SECURITY_LOG,
  auditLog: ADMIN_AUDIT_LOG,
  abuseSignals: ADMIN_ABUSE_SIGNALS,
};

export async function isAdminSecuritySupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (securityTableProbed) return securityTableAvailable;

  securityTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("security_audit_log").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("security_audit_log missing", error);
      }
      securityTableAvailable = false;
      return false;
    }
    securityTableAvailable = true;
    return true;
  } catch {
    securityTableAvailable = false;
    return false;
  }
}

function mergeWithDemo(snapshot: AdminSecuritySnapshot): AdminSecuritySnapshot {
  return {
    securityLog: snapshot.securityLog.length > 0 ? snapshot.securityLog : DEMO_SECURITY_SNAPSHOT.securityLog,
    auditLog: snapshot.auditLog.length > 0 ? snapshot.auditLog : DEMO_SECURITY_SNAPSHOT.auditLog,
    abuseSignals:
      snapshot.abuseSignals.length > 0 ? snapshot.abuseSignals : DEMO_SECURITY_SNAPSHOT.abuseSignals,
  };
}

export async function getAdminSecuritySnapshot(): Promise<AdminSecuritySnapshot> {
  if (!(await isAdminSecuritySupabaseReady())) {
    return DEMO_SECURITY_SNAPSHOT;
  }

  const snapshot = await runOptionalDbSync(
    "getAdminSecuritySnapshot",
    () => getAdminSecuritySnapshotFromSupabase(),
    DEMO_SECURITY_SNAPSHOT
  );

  return mergeWithDemo(snapshot);
}

export function isAdminSecurityPersistenceActive(): boolean {
  return securityTableAvailable;
}

export type { AdminSecuritySnapshot };
