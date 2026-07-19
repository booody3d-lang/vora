import { cookies } from "next/headers";

import { COOKIE_NAME, verifySessionToken } from "@/lib/security/jwt";

import type { AuthUser, SessionPayload } from "@/types/security";

import { findAccountById, isSessionValid, toPublicUser } from "@/lib/security/demo-store";

import {
  isPersistedSessionValid,
  persistSession,
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



export async function getServerSession(): Promise<SessionPayload | null> {

  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);

  if (!payload) return null;

  let sessionKnown =
    isSessionValid(payload.sessionId) ||
    isPersistedSessionValid(payload.sessionId, payload.sub);

  if (!sessionKnown) {
    persistSession({
      sessionId: payload.sessionId,
      accountId: payload.sub,
      userAgent: "recovered",
      ip: "unknown",
      createdAt: new Date((payload.iat ?? 0) * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
    sessionKnown = true;
  }

  if (!sessionKnown) return null;

  touchPersistedSession(payload.sessionId);



  const account = findAccountById(payload.sub);

  if (!account || account.isBanned) return null;



  const effectiveRole = resolveEffectiveRole(account);

  return {

    ...payload,

    role: effectiveRole,

    email: account.email,

  };

}



export async function getAuthenticatedUser() {

  const session = await getServerSession();

  if (!session) return null;

  const account = findAccountById(session.sub);

  if (!account) return null;

  const effectiveRole = resolveEffectiveRole(account);

  const user = {

    ...toPublicUser(account),

    role: effectiveRole,

  };

  return {

    session,

    user: {

      ...user,

      profileSlug: getProfileSlugForAccount(account.id) ?? undefined,

      storeSlug: getStoreSlugForAccount(account.id) ?? undefined,

      gender: getGenderForAccount(account.id),

    },

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


