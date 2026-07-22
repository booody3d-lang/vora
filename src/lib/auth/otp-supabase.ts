import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OtpDeliveryChannel, OtpPurpose } from "@/types/auth-phone";

const OTP_TTL_MS = 5 * 60_000;

export interface DbOtpRow {
  id: string;
  phone: string;
  code_hash: string;
  purpose: OtpPurpose;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  channel: OtpDeliveryChannel | null;
  provider_ref: string | null;
}

export interface StoredOtpRecord {
  id: string;
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  channel: OtpDeliveryChannel;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  providerRef?: string;
}

function mapRow(row: DbOtpRow): StoredOtpRecord {
  return {
    id: row.id,
    phone: row.phone,
    codeHash: row.code_hash,
    purpose: row.purpose,
    channel: row.channel ?? "sms",
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    expiresAt: new Date(row.expires_at).getTime(),
    providerRef: row.provider_ref ?? undefined,
  };
}

export async function saveOtpInSupabase(input: {
  phone: string;
  codeHash: string;
  purpose: OtpPurpose;
  channel: OtpDeliveryChannel;
  ip?: string;
  providerRef?: string;
}): Promise<StoredOtpRecord> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await admin
    .from("otp_codes")
    .delete()
    .eq("phone", input.phone)
    .eq("purpose", input.purpose)
    .is("verified_at", null);

  const { data, error } = await admin
    .from("otp_codes")
    .insert({
      phone: input.phone,
      code_hash: input.codeHash,
      purpose: input.purpose,
      channel: input.channel,
      provider_ref: input.providerRef ?? null,
      ip_address: input.ip ?? null,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as DbOtpRow);
}

export async function getActiveOtpFromSupabase(
  phone: string,
  purpose: OtpPurpose
): Promise<StoredOtpRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as DbOtpRow);
}

export async function incrementOtpAttemptsInSupabase(id: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("otp_codes").select("attempts").eq("id", id).single();
  if (error) throw error;

  const nextAttempts = Number(data.attempts ?? 0) + 1;
  const { error: updateError } = await admin
    .from("otp_codes")
    .update({ attempts: nextAttempts })
    .eq("id", id);
  if (updateError) throw updateError;
}

export async function markOtpVerifiedInSupabase(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
