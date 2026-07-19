import { cookies } from "next/headers";
import { enrichAuthUser, resolveAuthUser } from "@/lib/auth/supabase-account";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { COOKIE_NAME, verifySessionToken } from "@/lib/security/jwt";
import type { AuthUser, SessionPayload } from "@/types/security";
import { findAccountById, isSessionValid, toPublicUser } from "@/lib/security/demo-store";
import {
  isPersistedSessionValid,
  touchPersistedSession,
} from "@/lib/security/auth-store";
import {
  canAccessAdminPanel,
  canAccessFinancialData,
  canConfigureStripe,
  canManageSubscriptionBadges,
  canMonitorSiteActivity,
  isPlatformOwner,
  resolveEffectiveRole,
} from "@/lib/security/roles";
import {
  getGenderForAccount,
  getProfileSlugForAccount,
  getStoreSlugForAccount,
} from "@/lib/profile/profile-store";

async function getLegacyServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const sessionKnown =
    isSessionValid(payload.sessionId) ||
    isPersistedSessionValid(payload.sessionId, payload.sub);
  if (!sessionKnown) return null;

  touchPersistedSession(payload.sessionId);

  const account = findAccountById(payload.sub);
  if (!account || account.isBanned) return null;

  return {
    ...payload,
    role: resolveEffectiveRole(account),
    email: account.email,
  };
}

async function getLegacyAuthenticatedUser() {
  const session = await getLegacyServerSession();
  if (!session) return null;

  const account = findAccountById(session.sub);
  if (!account) return null;

  const effectiveRole = resolveEffectiveRole(account);
  const user = {
    ...toPublicUser(account),
    role: effectiveRole,
    profileSlug: getProfileSlugForAccount(account.id) ?? undefined,
    storeSlug: getStoreSlugForAccount(account.id) ?? undefined,
    gender: getGenderForAccount(account.id),
  };

  return { session, user };
}

export async function getServerSession(): Promise<SessionPayload | null> {
  if (!isSupabaseConfigured()) {
    return getLegacyServerSession();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const authUser = await resolveAuthUser(user);
  if (!authUser || authUser.isBanned) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: user.id,
    email: authUser.email,
    role: resolveEffectiveRole(authUser),
    sessionId: session?.access_token?.slice(-24) ?? user.id,
    iat: now,
    exp: session?.expires_at ?? now + 3600,
  };
}

export async function getAuthenticatedUser(): Promise<{
  session: SessionPayload;
  user: AuthUser;
} | null> {
  if (!isSupabaseConfigured()) {
    return getLegacyAuthenticatedUser();
  }

  const session = await getServerSession();
  if (!session) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const authUser = await resolveAuthUser(user);
  if (!authUser) return null;

  return {
    session,
    user: enrichAuthUser(authUser),
  };
}

export function requireRole(session: SessionPayload, roles: SessionPayload["role"][]): boolean {
  return roles.includes(session.role);
}

export function requirePlatformOwner(user: Pick<AuthUser, "email" | "role"> | null | undefined): boolean {
  return isPlatformOwner(user);
}

export function requireFinancialAccess(user: Pick<AuthUser, "email" | "role"> | null | undefined): boolean {
  return canAccessFinancialData(user);
}

export function requireAdminPanel(user: Pick<AuthUser, "email" | "role"> | null | undefined): boolean {
  return canAccessAdminPanel(user);
}

export function requireSubscriptionManagement(
  user: Pick<AuthUser, "email" | "role"> | null | undefined
): boolean {
  return canManageSubscriptionBadges(user);
}

export function requireStripeConfiguration(
  user: Pick<AuthUser, "email" | "role"> | null | undefined
): boolean {
  return canConfigureStripe(user);
}

export function requireActivityMonitoring(
  user: Pick<AuthUser, "email" | "role"> | null | undefined
): boolean {
  return canMonitorSiteActivity(user);
}
