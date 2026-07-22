import "server-only";

import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth/auth-diagnostics";
import {
  buildAuthUserFromMetadata,
  enrichAuthUser,
  findAccountByPhoneFromDb,
  resolveAuthUser,
  upsertAccountRow,
} from "@/lib/auth/supabase-account";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser, VoraRole } from "@/types/security";

const PHONE_EMAIL_DOMAIN = "@phone.vora.sa";

export function phoneToSyntheticEmail(phoneE164: string): string {
  return `${phoneE164.replace("+", "")}${PHONE_EMAIL_DOMAIN}`;
}

export function isSyntheticPhoneEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(PHONE_EMAIL_DOMAIN);
}

function buildRandomPassword(): string {
  return `${crypto.randomUUID()}Aa1!${crypto.randomUUID().slice(0, 8)}`;
}

async function establishSessionViaMagicLink(
  email: string
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  if (!isAdminClientAvailable()) {
    return { ok: false, error: "Supabase admin is not configured" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim().toLowerCase(),
  });

  if (error || !data.properties?.hashed_token) {
    return { ok: false, error: error?.message ?? "Failed to create auth session" };
  }

  const supabase = await createClient();
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });

  if (verifyError || !sessionData.user) {
    return { ok: false, error: verifyError?.message ?? "Failed to verify auth session" };
  }

  return { ok: true, user: sessionData.user };
}

async function createSyntheticPhoneUser(input: {
  phoneE164: string;
  fullName?: string;
  role?: VoraRole;
}): Promise<{ ok: true; user: User; email: string } | { ok: false; error: string }> {
  const email = phoneToSyntheticEmail(input.phoneE164);
  const password = buildRandomPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName ?? "VORA User",
      role: input.role ?? "registered",
      phone: input.phoneE164,
    },
  });

  if (error) {
    const existing = await findAuthUserByEmail(email);
    if (existing) {
      const sessionResult = await establishSessionViaMagicLink(email);
      return sessionResult.ok
        ? { ok: true, user: sessionResult.user, email }
        : { ok: false, error: sessionResult.error };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: "User creation failed" };
  }

  const supabase = await createClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    return { ok: false, error: signInError?.message ?? "Sign-in failed" };
  }

  return { ok: true, user: signInData.user, email };
}

export async function resolvePhoneLoginSession(input: {
  phoneE164: string;
  fullName?: string;
}): Promise<
  | { ok: true; authUser: AuthUser }
  | { ok: false; error: string; status: number }
> {
  if (!isSupabaseConfigured() || !isAdminClientAvailable()) {
    return { ok: false, error: "Phone login requires Supabase authentication", status: 503 };
  }

  const existingAccount = await findAccountByPhoneFromDb(input.phoneE164);
  if (existingAccount?.isBanned) {
    return { ok: false, error: "Account suspended", status: 403 };
  }

  let authUserRecord: User;

  if (existingAccount) {
    const sessionResult = await establishSessionViaMagicLink(existingAccount.email);
    if (!sessionResult.ok) {
      return { ok: false, error: sessionResult.error, status: 502 };
    }
    authUserRecord = sessionResult.user;
  } else {
    const syntheticEmail = phoneToSyntheticEmail(input.phoneE164);
    const existingAuth = await findAuthUserByEmail(syntheticEmail);
    if (existingAuth) {
      const sessionResult = await establishSessionViaMagicLink(syntheticEmail);
      if (!sessionResult.ok) {
        return { ok: false, error: sessionResult.error, status: 502 };
      }
      authUserRecord = sessionResult.user;
    } else {
      const created = await createSyntheticPhoneUser(input);
      if (!created.ok) {
        return { ok: false, error: created.error, status: 502 };
      }
      authUserRecord = created.user;
    }
  }

  let authUser = buildAuthUserFromMetadata(authUserRecord);
  authUser = {
    ...authUser,
    phone: input.phoneE164,
    phoneVerified: true,
  };

  await upsertAccountRow(authUser);

  try {
    const resolved = await resolveAuthUser(authUserRecord);
    if (resolved) {
      authUser = { ...resolved, phone: input.phoneE164, phoneVerified: true };
      await upsertAccountRow(authUser);
    }
  } catch (resolveError) {
    console.error("[phone-auth] resolveAuthUser failed:", resolveError);
  }

  if (authUser.isBanned) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { ok: false, error: "Account suspended", status: 403 };
  }

  return { ok: true, authUser: enrichAuthUser(authUser) };
}

export async function linkPhoneToAuthenticatedUser(input: {
  authUser: AuthUser;
  phoneE164: string;
  phoneCountry?: string;
  preferredChannel?: "sms" | "whatsapp";
}): Promise<
  | { ok: true; authUser: AuthUser }
  | { ok: false; error: string; status: number }
> {
  const taken = await findAccountByPhoneFromDb(input.phoneE164);
  if (taken && taken.id !== input.authUser.id) {
    return {
      ok: false,
      error: "Phone number is already linked to another account",
      status: 409,
    };
  }

  if (isAdminClientAvailable()) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(input.authUser.id, {
      user_metadata: {
        phone: input.phoneE164,
        phone_verified: true,
        phone_country: input.phoneCountry ?? null,
        preferred_otp_channel: input.preferredChannel ?? null,
      },
    });
    if (error) {
      console.error("[phone-auth] updateUser metadata failed:", error.message);
    }
  }

  const updated: AuthUser = {
    ...input.authUser,
    phone: input.phoneE164,
    phoneVerified: true,
  };

  await upsertAccountRow(updated, {
    phoneCountry: input.phoneCountry,
    preferredOtpChannel: input.preferredChannel,
  });

  return { ok: true, authUser: enrichAuthUser(updated) };
}
