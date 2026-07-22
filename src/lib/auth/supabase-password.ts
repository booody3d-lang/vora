import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SITE_URL } from "@/i18n/config";
import { validatePassword } from "@/lib/security/password";

function passwordResetRedirectUrl(): string {
  return `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
}

export async function requestSupabasePasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return { ok: false, error: "A valid email address is required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: passwordResetRedirectUrl(),
  });

  if (error) {
    console.error("[supabase-password] resetPasswordForEmail failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Development-only recovery link for local testing without SMTP. Never returned to clients in production. */
export async function generateDevRecoveryLink(
  email: string
): Promise<string | null> {
  if (process.env.NODE_ENV === "production" || !isAdminClientAvailable()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: email.trim().toLowerCase(),
    options: { redirectTo: passwordResetRedirectUrl() },
  });

  if (error) {
    console.error("[supabase-password] generateLink failed:", error.message);
    return null;
  }

  return data.properties?.action_link ?? null;
}

export async function changeSupabasePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Invalid password" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: currentPassword,
  });

  if (signInError) {
    return { ok: false, error: "Current password is incorrect" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    console.error("[supabase-password] updateUser failed:", updateError.message);
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function resetSupabasePasswordWithSession(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Invalid password" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Recovery session expired. Request a new reset link." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("[supabase-password] recovery update failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
