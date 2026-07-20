import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthError, User } from "@supabase/supabase-js";

export function getSupabaseAuthUrl(): string | null {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseUrl();
}

export function getSupabaseProjectLabel(): string {
  const url = getSupabaseAuthUrl();
  if (!url) return "not-configured";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getSupabaseAuthDiagnostics() {
  return {
    supabaseUrl: getSupabaseAuthUrl(),
    supabaseProject: getSupabaseProjectLabel(),
    supabaseConfigured: isSupabaseConfigured(),
    supabaseAdminAvailable: isAdminClientAvailable(),
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}

export function logAuthRequest(
  route: "login" | "signup",
  payload: Record<string, unknown>
): void {
  console.info(`[auth/${route}] attempt`, {
    ...getSupabaseAuthDiagnostics(),
    ...payload,
  });
}

export function logAuthFailure(
  route: "login" | "signup",
  reason: string,
  extra?: Record<string, unknown>
): void {
  console.error(`[auth/${route}] failed`, {
    reason,
    ...getSupabaseAuthDiagnostics(),
    ...extra,
  });
}

export function isDuplicateSignupError(error: AuthError): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists") ||
    message.includes("email address is already") ||
    error.status === 422
  );
}

export function isDuplicateSignupUser(user: User | null | undefined): boolean {
  return Boolean(user && (!user.identities || user.identities.length === 0));
}

interface SignupConflictDiagnostics {
  email: string;
  supabaseUrl: string | null;
  supabaseProject: string;
  supabaseAdminAvailable: boolean;
  authUser: { id: string; email?: string; createdAt?: string } | null;
  accountRow: { id: string; email: string; createdAt?: string } | null;
  vercel: boolean;
}

export async function inspectSignupEmailConflict(email: string): Promise<SignupConflictDiagnostics> {
  const normalizedEmail = email.trim();
  const diagnostics: SignupConflictDiagnostics = {
    email: normalizedEmail,
    supabaseUrl: getSupabaseAuthUrl(),
    supabaseProject: getSupabaseProjectLabel(),
    supabaseAdminAvailable: isAdminClientAvailable(),
    authUser: null,
    accountRow: null,
    vercel: Boolean(process.env.VERCEL),
  };

  if (!isAdminClientAvailable()) {
    return diagnostics;
  }

  const admin = createAdminClient();

  const { data: accountRow, error: accountError } = await admin
    .from("accounts")
    .select("id, email, created_at")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (accountError) {
    console.error("[auth/signup] accounts lookup failed:", accountError.message);
  } else if (accountRow) {
    diagnostics.accountRow = {
      id: accountRow.id,
      email: accountRow.email,
      createdAt: accountRow.created_at,
    };
  }

  diagnostics.authUser = await findAuthUserByEmail(normalizedEmail);

  return diagnostics;
}

export async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email?: string; createdAt?: string; emailConfirmed: boolean } | null> {
  if (!isAdminClientAvailable()) return null;

  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("[auth/signup] auth.admin.listUsers failed:", error.message);
      return null;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) {
      return {
        id: match.id,
        email: match.email,
        createdAt: match.created_at,
        emailConfirmed: Boolean(match.email_confirmed_at),
      };
    }

    if (data.users.length < 200) break;
  }

  return null;
}

export type SignupEmailPrepResult = "ready" | "exists-confirmed" | "no-admin";

/** Removes unconfirmed Supabase auth users so signup can proceed cleanly. */
export async function prepareEmailForSignup(email: string): Promise<SignupEmailPrepResult> {
  if (!isAdminClientAvailable()) return "no-admin";

  const existing = await findAuthUserByEmail(email);
  if (!existing) return "ready";

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(existing.id);
  if (error || !data.user) return "ready";

  if (data.user.email_confirmed_at) {
    return "exists-confirmed";
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(existing.id);
  if (deleteAuthError) {
    console.error("[auth/signup] delete unconfirmed auth user failed:", deleteAuthError.message);
    return "ready";
  }

  await admin.from("accounts").delete().eq("id", existing.id);

  console.warn("[auth/signup] removed unconfirmed auth user before signup retry", {
    email: email.trim(),
    userId: existing.id,
    ...getSupabaseAuthDiagnostics(),
  });

  return "ready";
}

export async function cleanupStaleAccountRowForEmail(email: string): Promise<boolean> {
  if (!isAdminClientAvailable()) return false;

  const admin = createAdminClient();
  const normalizedEmail = email.trim();

  const { data: accountRow, error: accountError } = await admin
    .from("accounts")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (accountError || !accountRow) return false;

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(accountRow.id);
  if (!authError && authUser.user) return false;

  const { error: deleteError } = await admin.from("accounts").delete().eq("id", accountRow.id);
  if (deleteError) {
    console.error("[auth/signup] stale account cleanup failed:", deleteError.message);
    return false;
  }

  console.warn("[auth/signup] removed stale accounts row without auth user", {
    email: normalizedEmail,
    accountId: accountRow.id,
    ...getSupabaseAuthDiagnostics(),
  });
  return true;
}

export function logSignupConflict(
  reason: string,
  diagnostics: SignupConflictDiagnostics,
  extra?: Record<string, unknown>
): void {
  console.error("[auth/signup] conflict", {
    reason,
    ...diagnostics,
    ...extra,
  });
}

export function logSupabaseSignupError(
  error: AuthError,
  diagnostics: SignupConflictDiagnostics
): void {
  console.error("[auth/signup] supabase signUp rejected", {
    message: error.message,
    status: error.status,
    code: error.code,
    name: error.name,
    ...diagnostics,
  });
}

export function logSupabaseLoginError(
  error: AuthError,
  email: string
): void {
  console.error("[auth/login] supabase signIn rejected", {
    email: email.trim(),
    message: error.message,
    status: error.status,
    code: error.code,
    name: error.name,
    ...getSupabaseAuthDiagnostics(),
  });
}

export interface AuthApiErrorBody {
  error: string;
  code?: string;
  status?: number;
  stage?: string;
  messageAr?: string;
  action?: string;
}

export function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(typeof error === "object" && error !== null
        ? Object.fromEntries(
            Object.getOwnPropertyNames(error)
              .filter((key) => !["name", "message", "stack"].includes(key))
              .map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
          )
        : {}),
    };
  }

  if (error && typeof error === "object") {
    return Object.fromEntries(Object.getOwnPropertyNames(error).map((key) => [key, (error as Record<string, unknown>)[key]]));
  }

  return { value: String(error) };
}

export function logSignupUnhandledError(error: unknown, stage: string, extra?: Record<string, unknown>): void {
  const serialized = serializeUnknownError(error);
  console.error("[auth/signup] unhandled error", {
    stage,
    ...serialized,
    ...getSupabaseAuthDiagnostics(),
    ...extra,
  });
}

export function supabaseAuthErrorResponse(
  error: AuthError,
  stage = "supabase-signup"
): AuthApiErrorBody {
  return {
    error: error.message || "Supabase signup failed",
    code: error.code,
    status: error.status,
    stage,
  };
}
