import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isOwnerOnlyAdminRoute } from "@/lib/admin/admin-nav";
import {
  getMinimumRoleForRoute,
  isRouteAllowedForRole,
  roleMeetsMinimum,
} from "@/lib/security/rbac";
import { parseVoraRole } from "@/lib/security/parse-vora-role";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";

function resolveRoleFromMetadata(user: User): VoraRole {
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};
  const role = parseVoraRole(meta.role ?? appMeta.role) ?? "registered";
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

  if (!prodError && prodRow) {
    const fromAccountType = parseVoraRole(prodRow.account_type);
    if (fromAccountType) {
      return resolveEffectiveRole({ email, role: fromAccountType });
    }
  }

  if (prodError && !isMissingColumnError(prodError)) {
    // Non-schema errors fall through to primary_role / metadata.
  }

  const { data: fullRow, error: fullError } = await supabase
    .from("accounts")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!fullError && fullRow) {
    const fromPrimary = parseVoraRole(fullRow.primary_role);
    if (fromPrimary) {
      return resolveEffectiveRole({ email, role: fromPrimary });
    }
  }

  const { data: ownedCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_account_id", user.id)
    .limit(1)
    .maybeSingle();

  if (ownedCompany) {
    return resolveEffectiveRole({ email, role: "company" });
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

  if (isOwnerOnlyAdminRoute(pathname) && role !== "owner") {
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
  return (
    pathname === "/network" ||
    pathname === "/network/" ||
    pathname === "/network/jobs"
  );
}

export function getCompanyNetworkRedirectTarget(pathname: string): string | null {
  if (pathname === "/network" || pathname === "/network/") {
    return "/company/dashboard";
  }
  if (pathname === "/network/jobs") {
    return "/company/dashboard/jobs";
  }
  return null;
}
