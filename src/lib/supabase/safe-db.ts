import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { getSupabaseAuthDiagnostics } from "@/lib/auth/auth-diagnostics";

export interface SupabaseDbErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function isMissingRelationError(error: SupabaseDbErrorLike | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? error.details ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

let dbSyncAvailable: boolean | null = null;
let bootstrapAttempted = false;

export function isSupabaseDbSyncEnabled(): boolean {
  if (!isAdminClientAvailable()) return false;
  if (dbSyncAvailable === false) return false;
  return true;
}

export function markSupabaseDbSyncUnavailable(reason: string, error?: SupabaseDbErrorLike): void {
  dbSyncAvailable = false;
  console.warn("[safe-db] Supabase DB sync disabled (auth will continue without DB tables)", {
    reason,
    code: error?.code,
    message: error?.message ?? error?.details,
    ...getSupabaseAuthDiagnostics(),
    hint: "Apply SQL migrations in supabase/migrations or run vora_ensure_core_schema() in Supabase SQL editor",
  });
}

export function noteSupabaseDbSyncAvailable(): void {
  dbSyncAvailable = true;
}

export async function tryBootstrapCoreSchema(): Promise<boolean> {
  if (!isAdminClientAvailable() || bootstrapAttempted) {
    return dbSyncAvailable === true;
  }

  bootstrapAttempted = true;
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("vora_ensure_core_schema");
  if (error) {
    if (!isMissingRelationError(error) && !error.message.includes("vora_ensure_core_schema")) {
      console.error("[safe-db] bootstrap rpc failed:", error.message);
    } else {
      console.warn(
        "[safe-db] bootstrap function missing — run supabase/migrations/012_core_schema_bootstrap_fn.sql in Supabase SQL editor"
      );
    }
    return false;
  }

  console.info("[safe-db] core schema bootstrap completed", data);
  noteSupabaseDbSyncAvailable();
  return true;
}

export async function probeCoreSchema(): Promise<boolean> {
  if (!isAdminClientAvailable()) return false;
  if (dbSyncAvailable === true) return true;
  if (dbSyncAvailable === false) return false;

  const admin = createAdminClient();
  const { error } = await admin.from("accounts").select("id").limit(1);

  if (!error) {
    noteSupabaseDbSyncAvailable();
    return true;
  }

  if (isMissingRelationError(error)) {
    const bootstrapped = await tryBootstrapCoreSchema();
    if (bootstrapped) {
      const retry = await admin.from("accounts").select("id").limit(1);
      if (!retry.error) {
        noteSupabaseDbSyncAvailable();
        return true;
      }
    }
    markSupabaseDbSyncUnavailable("core tables missing", error);
    return false;
  }

  console.error("[safe-db] accounts probe failed:", error.message);
  return false;
}

export async function runOptionalDbSync<T>(
  label: string,
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isSupabaseDbSyncEnabled()) {
    return fallback;
  }

  try {
    const result = await operation();
    noteSupabaseDbSyncAvailable();
    return result;
  } catch (error) {
    const dbError = error as SupabaseDbErrorLike;
    if (isMissingRelationError(dbError) || (error instanceof Error && isMissingRelationError({ message: error.message }))) {
      markSupabaseDbSyncUnavailable(label, dbError);
      return fallback;
    }
    console.error(`[safe-db] ${label} failed:`, error);
    return fallback;
  }
}

export async function runOptionalDbSyncVoid(label: string, operation: () => Promise<void>): Promise<void> {
  await runOptionalDbSync(label, async () => {
    await operation();
    return true;
  }, false);
}
