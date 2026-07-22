import type { User } from "@supabase/supabase-js";
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

export function resolveRoleFromSupabaseUser(user: User): VoraRole {
  const meta = user.user_metadata ?? {};
  const role = parseRole(meta.role);
  return resolveEffectiveRole({ email: user.email ?? "", role });
}

export function isPageAllowedForUser(pathname: string, user: User): boolean {
  const role = resolveRoleFromSupabaseUser(user);

  if (!isRouteAllowedForRole(pathname, role)) {
    return false;
  }

  const minimumRole = getMinimumRoleForRoute(pathname);
  if (minimumRole && !roleMeetsMinimum(role, minimumRole)) {
    return false;
  }

  return true;
}

export function getAccessDeniedRedirect(pathname: string, role: VoraRole): string {
  if (pathname.startsWith("/admin")) {
    return role === "company" ? "/company/dashboard" : "/network";
  }
  if (pathname.startsWith("/company/dashboard")) {
    return "/network";
  }
  return "/network";
}
