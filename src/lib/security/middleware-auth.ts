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

/** Prefer DB account role (matches server session) over JWT user_metadata. */
export async function resolveRoleForMiddleware(
  user: User,
  supabase: SupabaseClient
): Promise<VoraRole> {
  const email = user.email ?? "";

  const { data: fullRow, error: fullError } = await supabase
    .from("accounts")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!fullError && fullRow?.primary_role) {
    const role = parseRole(fullRow.primary_role);
    return resolveEffectiveRole({ email, role });
  }

  const { data: prodRow, error: prodError } = await supabase
    .from("accounts")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!prodError && prodRow?.account_type) {
    const role = parseRole(prodRow.account_type);
    return resolveEffectiveRole({ email, role });
  }

  return resolveRoleFromMetadata(user);
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
  if (pathname.startsWith("/admin")) {
    return role === "company" ? "/company/dashboard" : "/network";
  }
  if (pathname.startsWith("/company/dashboard")) {
    return role === "company" ? "/company/onboarding" : "/network";
  }
  if (role === "company") {
    return "/company/dashboard";
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
  if (
    role === "company" &&
    pathname.startsWith("/company/dashboard") &&
    (target === "/network" || target === "/network/" || target.startsWith("/company/dashboard"))
  ) {
    return false;
  }
  return true;
}

export function isCompanyNetworkRedirectSource(pathname: string): boolean {
  return (
    pathname === "/network" ||
    pathname === "/network/" ||
    pathname === "/network/jobs" ||
    pathname.startsWith("/network/profile/")
  );
}

export function getCompanyNetworkRedirectTarget(pathname: string): string | null {
  if (pathname.startsWith("/network/profile/")) return "/profile/me";
  if (pathname === "/network" || pathname === "/network/") return "/company/dashboard";
  if (pathname === "/network/jobs") return "/company/dashboard/jobs";
  return null;
}
