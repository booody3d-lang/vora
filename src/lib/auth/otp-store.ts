import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfiguredOtpProvider, assertOtpProviderReady } from "@/lib/auth/otp-provider";
import { writeSecurityAuditEvent } from "@/lib/security/audit-store";
import {
  getActiveOtpFromSupabase,
  incrementOtpAttemptsInSupabase,
  markOtpVerifiedInSupabase,
  saveOtpInSupabase,
  type StoredOtpRecord,
} from "@/lib/auth/otp-supabase";
import { generateOtpCode, hashOtp, verifyOtp } from "@/lib/security/otp";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import type { OtpDeliveryChannel, OtpPurpose } from "@/types/auth-phone";

const OTP_FILE = "otp-codes.json";
const OTP_TTL_MS = 5 * 60_000;

interface OtpDataFile {
  records: StoredOtpRecord[];
}

let otpTableProbed = false;
let otpTableAvailable = false;

function otpKey(phone: string, purpose: OtpPurpose): string {
  return `${phone}:${purpose}`;
}

export async function isOtpSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (otpTableProbed) return otpTableAvailable;

  otpTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("otp_codes").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("otp_codes missing", error);
      }
      otpTableAvailable = false;
      return false;
    }
    otpTableAvailable = true;
    return true;
  } catch {
    otpTableAvailable = false;
    return false;
  }
}

function readOtpData(): OtpDataFile {
  return readJsonStore(OTP_FILE, () => ({ records: [] }));
}

function writeOtpData(data: OtpDataFile) {
  writeJsonStore(OTP_FILE, data);
}

function readJsonOtp(phone: string, purpose: OtpPurpose): StoredOtpRecord | null {
  const data = readOtpData();
  const record = data.records.find((entry) => entry.phone === phone && entry.purpose === purpose);
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record;
}

function saveJsonOtp(record: StoredOtpRecord) {
  const data = readOtpData();
  data.records = data.records.filter(
    (entry) => !(entry.phone === record.phone && entry.purpose === record.purpose)
  );
  data.records.unshift(record);
  writeOtpData(data);
}

function incrementJsonOtpAttempts(phone: string, purpose: OtpPurpose) {
  const data = readOtpData();
  const index = data.records.findIndex(
    (record) => record.phone === phone && record.purpose === purpose
  );
  if (index >= 0) {
    data.records[index] = { ...data.records[index], attempts: data.records[index].attempts + 1 };
    writeOtpData(data);
  }
}

function clearJsonOtp(phone: string, purpose: OtpPurpose) {
  const data = readOtpData();
  data.records = data.records.filter(
    (entry) => !(entry.phone === phone && entry.purpose === purpose)
  );
  writeOtpData(data);
}

async function persistOtpRecord(input: {
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  channel: OtpDeliveryChannel;
  ip?: string;
  providerRef?: string;
}): Promise<StoredOtpRecord> {
  const jsonRecord: StoredOtpRecord = {
    id: otpKey(input.phone, input.purpose),
    phone: input.phone,
    codeHash: input.codeHash,
    purpose: input.purpose,
    channel: input.channel,
    attempts: 0,
    maxAttempts: 5,
    expiresAt: Date.now() + OTP_TTL_MS,
    providerRef: input.providerRef,
  };

  saveJsonOtp(jsonRecord);

  if (!(await isOtpSupabaseReady())) {
    return jsonRecord;
  }

  return runOptionalDbSync(
    "persistOtpRecord",
    () =>
      saveOtpInSupabase({
        phone: input.phone,
        codeHash: input.codeHash,
        purpose: input.purpose,
        channel: input.channel,
        ip: input.ip,
        providerRef: input.providerRef,
      }),
    jsonRecord
  );
}

async function loadActiveOtp(phone: string, purpose: OtpPurpose): Promise<StoredOtpRecord | null> {
  const jsonRecord = readJsonOtp(phone, purpose);

  if (!(await isOtpSupabaseReady())) {
    return jsonRecord;
  }

  const liveRecord = await runOptionalDbSync(
    "loadActiveOtp",
    () => getActiveOtpFromSupabase(phone, purpose),
    jsonRecord
  );

  return liveRecord ?? jsonRecord;
}

export interface SendOtpResult {
  phone: string;
  purpose: OtpPurpose;
  channel: OtpDeliveryChannel;
  provider: string;
  demoCode?: string;
  persistence: "supabase" | "json";
}

export async function sendOtpDelivery(input: {
  phone: string;
  purpose: OtpPurpose;
  channel?: OtpDeliveryChannel;
  ip?: string;
  ipAddress?: string;
}): Promise<SendOtpResult> {
  const channel = input.channel ?? "sms";
  const code = generateOtpCode();
  const codeHash = await hashOtp(code);

  assertOtpProviderReady(channel);
  const provider = getConfiguredOtpProvider();

  let delivery;
  try {
    delivery = await provider.send({
      phoneE164: input.phone,
      code,
      channel,
      purpose: input.purpose,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP delivery failed";
    console.error("[otp] delivery failed", {
      channel,
      purpose: input.purpose,
      provider: provider.name,
      error: message,
    });
    await writeSecurityAuditEvent({
      accountId: null,
      action: "notification.otp.failed",
      severity: "warn",
      metadata: {
        channel,
        purpose: input.purpose,
        provider: provider.name,
        error: message,
      },
    });
    throw error;
  }

  await persistOtpRecord({
    phone: input.phone,
    codeHash,
    purpose: input.purpose,
    channel: delivery.channel,
    ip: input.ip ?? input.ipAddress,
    providerRef: delivery.providerRef,
  });

  return {
    phone: input.phone,
    purpose: input.purpose,
    channel: delivery.channel,
    provider: provider.name,
    demoCode: delivery.demoCode,
    persistence: (await isOtpSupabaseReady()) ? "supabase" : "json",
  };
}

export type VerifyOtpResult =
  | { ok: true; record: StoredOtpRecord }
  | { ok: false; error: string; status: number };

export async function verifyOtpDelivery(input: {
  phone: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<VerifyOtpResult> {
  const record = await loadActiveOtp(input.phone, input.purpose);
  if (!record || Date.now() > record.expiresAt) {
    return { ok: false, error: "OTP expired. Request a new code.", status: 400 };
  }

  if (record.attempts >= record.maxAttempts) {
    return { ok: false, error: "Too many OTP attempts", status: 429 };
  }

  const valid = await verifyOtp(input.code, record.codeHash);
  if (!valid) {
    incrementJsonOtpAttempts(input.phone, input.purpose);
    if (await isOtpSupabaseReady()) {
      const liveRecord = await getActiveOtpFromSupabase(input.phone, input.purpose);
      if (liveRecord) {
        await runOptionalDbSyncVoid("incrementOtpAttempts", () =>
          incrementOtpAttemptsInSupabase(liveRecord.id)
        );
      }
    }
    return { ok: false, error: "Invalid OTP code", status: 401 };
  }

  clearJsonOtp(input.phone, input.purpose);
  if (await isOtpSupabaseReady()) {
    const liveRecord = await getActiveOtpFromSupabase(input.phone, input.purpose);
    if (liveRecord) {
      await runOptionalDbSyncVoid("markOtpVerified", () =>
        markOtpVerifiedInSupabase(liveRecord.id)
      );
    }
  }

  return { ok: true, record };
}

export function isOtpPersistenceActive(): boolean {
  return otpTableAvailable;
}
