import { buildAuthUserFromMetadata, enrichAuthUser, resolveAuthUser } from "@/lib/auth/supabase-account";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthUser, SessionPayload } from "@/types/security";
import {
  canAccessAdminPanel,
  canAccessFinancialData,
  canConfigureStripe,
  canManageSubscriptionBadges,
  canMonitorSiteActivity,
  isPlatformOwner,
  resolveEffectiveRole,
} from "@/lib/security/roles";

export async function getServerSession(): Promise<SessionPayload | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  let authUser: Awaited<ReturnType<typeof resolveAuthUser>> = null;
  try {
    authUser = await resolveAuthUser(user);
  } catch (resolveError) {
    console.error("[session] resolveAuthUser failed, using auth metadata fallback:", resolveError);
    authUser = buildAuthUserFromMetadata(user);
  }
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
    return null;
  }

  const session = await getServerSession();
  if (!session) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let authUser: Awaited<ReturnType<typeof resolveAuthUser>> = null;
  try {
    authUser = await resolveAuthUser(user);
  } catch (resolveError) {
    console.error("[session] resolveAuthUser failed, using auth metadata fallback:", resolveError);
    authUser = buildAuthUserFromMetadata(user);
  }
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
