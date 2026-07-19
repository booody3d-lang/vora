import type { AuthUser, SessionPayload, VoraRole } from "@/types/security";



/** Canonical platform owner — sole financial / Stripe authority */

export const PLATFORM_OWNER_EMAIL = "booody3d@gmail.com";



/** Initial owner password (hashed on account init) */
export const PLATFORM_OWNER_INITIAL_PASSWORD = "Abadi.5789";

/** Manual secondary test account — standard registered user only */
export const MANUAL_TEST_USER_EMAIL = "b.3d@live.com";
export const MANUAL_TEST_USER_PASSWORD = "Vora@2026#Abadi";
export const MANUAL_TEST_USER_ID = "manual-test-user-b3d";

export const MAX_ADMIN_ACCOUNTS = 4;



export function normalizeEmail(email: string): string {

  return email.trim().toLowerCase();

}



export function isPlatformOwnerEmail(email: string): boolean {

  return normalizeEmail(email) === normalizeEmail(PLATFORM_OWNER_EMAIL);

}

export function isManualTestUserEmail(email: string): boolean {
  return normalizeEmail(email) === normalizeEmail(MANUAL_TEST_USER_EMAIL);
}

/** True when account is a plain registered user with no admin/owner effective role */
export function isStandardRegisteredUser(
  user: Pick<AuthUser, "email" | "role">
): boolean {
  if (isPlatformOwnerEmail(user.email)) return false;
  const effectiveRole = resolveEffectiveRole(user);
  return effectiveRole === "registered";
}



/**

 * Effective RBAC role: only the platform owner email may hold OWNER.

 * Any other account stored as owner is downgraded to limited ADMIN.

 */

export function resolveEffectiveRole(

  user: Pick<AuthUser, "email" | "role">

): VoraRole {

  if (isPlatformOwnerEmail(user.email)) {

    return "owner";

  }

  if (user.role === "owner") {

    return "admin";

  }

  return user.role;

}



export function isPlatformOwner(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  if (!user) return false;

  return resolveEffectiveRole(user) === "owner";

}



export function isLimitedAdmin(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  if (!user) return false;

  return resolveEffectiveRole(user) === "admin";

}



export function canAccessAdminPanel(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  if (!user) return false;

  const role = resolveEffectiveRole(user);

  return role === "admin" || role === "owner";

}



/** Financial reports, revenue, payouts, refunds, Stripe keys */

export function canAccessFinancialData(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  return isPlatformOwner(user);

}



/** Subscription tier + badge management (limited admins + owner) */

export function canManageSubscriptionBadges(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  return canAccessAdminPanel(user);

}



/** Site activity monitoring for limited admins */

export function canMonitorSiteActivity(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  return canAccessAdminPanel(user);

}



export function canConfigureStripe(

  user: Pick<AuthUser, "email" | "role"> | null | undefined

): boolean {

  return isPlatformOwner(user);

}



export function requirePlatformOwnerSession(

  session: SessionPayload | null,

  email: string

): boolean {

  if (!session) return false;

  return resolveEffectiveRole({ email, role: session.role }) === "owner";

}



export function countAdminRoleAccounts(

  accounts: Array<{ role: VoraRole; email: string }>

): number {

  return accounts.filter(

    (a) => a.role === "admin" && !isPlatformOwnerEmail(a.email)

  ).length;

}



export interface AdminAccessCapabilities {

  role: VoraRole;

  effectiveRole: VoraRole;

  email: string;

  isOwner: boolean;

  isLimitedAdmin: boolean;

  canViewFinance: boolean;

  canManageSubscriptions: boolean;

  canConfigureStripe: boolean;

  canMonitorActivity: boolean;

}



export function resolveAdminCapabilities(

  user: Pick<AuthUser, "email" | "role">

): AdminAccessCapabilities {

  const effectiveRole = resolveEffectiveRole(user);

  return {

    role: user.role,

    effectiveRole,

    email: user.email,

    isOwner: isPlatformOwner(user),

    isLimitedAdmin: isLimitedAdmin(user),

    canViewFinance: canAccessFinancialData(user),

    canManageSubscriptions: canManageSubscriptionBadges(user),

    canConfigureStripe: canConfigureStripe(user),

    canMonitorActivity: canMonitorSiteActivity(user),

  };

}

