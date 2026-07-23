import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import { verifyTotpCode } from "@/lib/security/otp";
import { decryptTotpSecret, encryptTotpSecret } from "@/lib/security/totp-crypto";

const TOTP_FILE = "totp-secrets.json";

interface TotpJsonRecord {
  accountId: string;
  secretEncrypted: string | null;
  totpEnabled: boolean;
  updatedAt: number;
}

interface TotpDataFile {
  records: TotpJsonRecord[];
}

export interface TotpAccountState {
  totpEnabled: boolean;
  hasSecret: boolean;
}

function readTotpData(): TotpDataFile {
  return readJsonStore(TOTP_FILE, () => ({ records: [] }));
}

function writeTotpData(data: TotpDataFile): void {
  writeJsonStore(TOTP_FILE, data);
}

function readJsonRecord(accountId: string): TotpJsonRecord | null {
  const data = readTotpData();
  return data.records.find((entry) => entry.accountId === accountId) ?? null;
}

function upsertJsonRecord(record: TotpJsonRecord): void {
  const data = readTotpData();
  data.records = data.records.filter((entry) => entry.accountId !== record.accountId);
  data.records.push(record);
  writeTotpData(data);
}

async function readFromSupabase(accountId: string): Promise<TotpJsonRecord | null> {
  if (!isAdminClientAvailable()) return null;

  return runOptionalDbSync(
    "read totp state",
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("accounts")
        .select("totp_secret, totp_enabled")
        .eq("id", accountId)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) {
          markSupabaseDbSyncUnavailable("read totp state", error);
        }
        throw error;
      }

      if (!data) return null;

      return {
        accountId,
        secretEncrypted: typeof data.totp_secret === "string" ? data.totp_secret : null,
        totpEnabled: Boolean(data.totp_enabled),
        updatedAt: Date.now(),
      };
    },
    null
  );
}

async function persistToSupabase(
  accountId: string,
  secretEncrypted: string | null,
  totpEnabled: boolean
): Promise<void> {
  if (!isAdminClientAvailable()) return;

  await runOptionalDbSyncVoid("persist totp state", async () => {
    const admin = createAdminClient();
    const { error } = await admin
      .from("accounts")
      .update({
        totp_secret: secretEncrypted,
        totp_enabled: totpEnabled,
      })
      .eq("id", accountId);

    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("persist totp state", error);
      } else {
        console.error("[totp-store] persist failed:", error.message);
      }
      return;
    }

    if (totpEnabled) {
      const { error: auditError } = await admin
        .from("accounts")
        .update({ totp_enabled_at: new Date().toISOString() })
        .eq("id", accountId);
      if (auditError && !auditError.message.includes("totp_enabled_at")) {
        console.warn("[totp-store] totp_enabled_at update skipped:", auditError.message);
      }
    } else {
      await admin.from("accounts").update({ totp_enabled_at: null }).eq("id", accountId);
    }
  });
}

async function getRecord(accountId: string): Promise<TotpJsonRecord | null> {
  if (isSupabasePersistenceEnabled()) {
    const fromDb = await readFromSupabase(accountId);
    if (fromDb) {
      upsertJsonRecord(fromDb);
      return fromDb;
    }
  }

  return readJsonRecord(accountId);
}

function decryptRecordSecret(record: TotpJsonRecord | null): string | null {
  if (!record?.secretEncrypted) return null;
  return decryptTotpSecret(record.secretEncrypted);
}

export async function getTotpAccountState(accountId: string): Promise<TotpAccountState> {
  const record = await getRecord(accountId);
  return {
    totpEnabled: record?.totpEnabled ?? false,
    hasSecret: Boolean(record?.secretEncrypted),
  };
}

export async function isTotpEnabledForAccount(accountId: string): Promise<boolean> {
  const state = await getTotpAccountState(accountId);
  return state.totpEnabled;
}

export async function saveTotpSetup(accountId: string, plainSecret: string): Promise<void> {
  const encrypted = encryptTotpSecret(plainSecret);
  const record: TotpJsonRecord = {
    accountId,
    secretEncrypted: encrypted,
    totpEnabled: false,
    updatedAt: Date.now(),
  };

  upsertJsonRecord(record);
  await persistToSupabase(accountId, encrypted, false);
}

export async function enableTotpForAccount(accountId: string, code: string): Promise<boolean> {
  const record = await getRecord(accountId);
  const secret = decryptRecordSecret(record);
  if (!secret || !verifyTotpCode(secret, code)) {
    return false;
  }

  const next: TotpJsonRecord = {
    accountId,
    secretEncrypted: record?.secretEncrypted ?? encryptTotpSecret(secret),
    totpEnabled: true,
    updatedAt: Date.now(),
  };
  upsertJsonRecord(next);
  await persistToSupabase(accountId, next.secretEncrypted, true);
  return true;
}

export async function clearTotpForAccount(accountId: string): Promise<void> {
  const next: TotpJsonRecord = {
    accountId,
    secretEncrypted: null,
    totpEnabled: false,
    updatedAt: Date.now(),
  };
  upsertJsonRecord(next);
  await persistToSupabase(accountId, null, false);
}

export async function disableTotpForAccount(accountId: string, code: string): Promise<boolean> {
  const record = await getRecord(accountId);
  const secret = decryptRecordSecret(record);
  if (!record?.totpEnabled || !secret || !verifyTotpCode(secret, code)) {
    return false;
  }

  await clearTotpForAccount(accountId);
  return true;
}

export async function verifyTotpForLogin(accountId: string, code: string): Promise<boolean> {
  const record = await getRecord(accountId);
  if (!record?.totpEnabled) return true;

  const secret = decryptRecordSecret(record);
  if (!secret) return false;
  return verifyTotpCode(secret, code);
}
