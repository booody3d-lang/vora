import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getMinimumRoleForRoute,
  isRouteAllowedForRole,
  roleMeetsMinimum,
} from "@/lib/security/rbac";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";

function parseRole(value: unknown): VoraRole {
  const roles: VoraRole[] = ["registered", "professional", "company", "admin", "owner"];
  if (typeof value === "string" && roles.includes(value as VoraRole)) {
    return value as VoraRole;
  }
  return "registered";
}

function resolveRoleFromMetadata(user: User): VoraRole {
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};
  const role = parseRole(meta.role ?? appMeta.role);
  return resolveEffectiveRole({ email: user.email ?? "", role });
}

export function resolveRoleFromSupabaseUser(user: User): VoraRole {
  return resolveRoleFromMetadata(user);
}

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "PGRST204" || (message.includes("could not find") && message.includes("column"));
}

/**
 * Match server session role resolution (resolveAuthUser / fetchAccountById):
 * production account_type first, then migration primary_role, then JWT metadata.
 */
export async function resolveRoleForMiddleware(
  user: User,
  supabase: SupabaseClient
): Promise<VoraRole> {
  const email = user.email ?? "";

  const { data: prodRow, error: prodError } = await supabase
    .from("accounts")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!prodError && prodRow?.account_type) {
    const role = parseRole(prodRow.account_type);
    return resolveEffectiveRole({ email, role });
  }

  if (prodError && !isMissingColumnError(prodError)) {
    // Non-schema errors fall through to primary_role / metadata.
  }

  const { data: fullRow, error: fullError } = await supabase
    .from("accounts")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!fullError && fullRow?.primary_role) {
    const role = parseRole(fullRow.primary_role);
    return resolveEffectiveRole({ email, role });
  }

  return resolveRoleFromMetadata(user);
}

export function isCompanyPath(pathname: string): boolean {
  return pathname === "/company" || pathname.startsWith("/company/");
}

export function isPageAllowedForRole(pathname: string, role: VoraRole): boolean {
  if (!isRouteAllowedForRole(pathname, role)) {
    return false;
  }

  const minimumRole = getMinimumRoleForRoute(pathname);
  if (minimumRole && !roleMeetsMinimum(role, minimumRole)) {
    return false;
  }

  return true;
}

export function isPageAllowedForUser(pathname: string, user: User): boolean {
  return isPageAllowedForRole(pathname, resolveRoleFromSupabaseUser(user));
}

export function getAccessDeniedRedirect(pathname: string, role: VoraRole): string {
  if (role === "company") {
    if (pathname.startsWith("/company/dashboard")) {
      return "/company/onboarding";
    }
    return "/company/dashboard";
  }
  if (pathname.startsWith("/admin")) {
    return "/network";
  }
  if (pathname.startsWith("/company/dashboard")) {
    return "/network";
  }
  return "/network";
}

/** Avoid middleware redirect loops (e.g. /network ↔ /company/dashboard). */
export function shouldApplyAccessDeniedRedirect(
  pathname: string,
  target: string,
  role: VoraRole
): boolean {
  if (target === pathname) return false;

  if (role === "company") {
    if (target === "/network" || target.startsWith("/network/")) {
      return false;
    }
    if (isCompanyPath(pathname)) {
      return false;
    }
  }

  return true;
}

/** Only the network feed root is redirected for company accounts (single middleware rule). */
export function isCompanyNetworkRedirectSource(pathname: string): boolean {
  return pathname === "/network" || pathname === "/network/";
}

export function getCompanyNetworkRedirectTarget(pathname: string): string | null {
  if (pathname === "/network" || pathname === "/network/") {
    return "/company/dashboard";
  }
  return null;
}
