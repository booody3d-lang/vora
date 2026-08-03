import type { RbacAction, VoraRole } from "@/types/security";

/** Match a path prefix and all subpaths (e.g. /network, /network/messages). */
function routePrefix(base: string): RegExp {
  const escaped = base.replace(/\//g, "\\/");
  return new RegExp(`^${escaped}(\\/.*)?$`);
}

const ROLE_PERMISSIONS: Record<VoraRole, Set<RbacAction>> = {
  visitor: new Set([
    "browse_public",
    "browse_freelance",
  ]),
  registered: new Set([
    "browse_public",
    "browse_freelance",
    "buy_service",
    "create_store",
    "list_service",
    "message_seller",
    "leave_rating",
  ]),
  professional: new Set([
    "browse_public",
    "browse_freelance",
    "buy_service",
    "create_store",
    "list_service",
    "message_seller",
    "leave_rating",
    "apply_job",
    "follow_connect",
    "network_message",
    "engage_content",
  ]),
  company: new Set([
    "browse_public",
    "manage_company",
    "manage_ats",
    "buy_corporate_plan",
    "network_message",
    "engage_content",
  ]),
  admin: new Set([
    "browse_public",
    "browse_freelance",
    "buy_service",
    "create_store",
    "list_service",
    "message_seller",
    "leave_rating",
    "apply_job",
    "follow_connect",
    "network_message",
    "engage_content",
    "moderate_content",
    "manage_support",
  ]),
  owner: new Set([
    "browse_public",
    "browse_freelance",
    "buy_service",
    "create_store",
    "list_service",
    "message_seller",
    "leave_rating",
    "apply_job",
    "follow_connect",
    "network_message",
    "engage_content",
    "manage_company",
    "manage_ats",
    "buy_corporate_plan",
    "moderate_content",
    "manage_support",
    "view_finance",
    "resolve_disputes",
    "manage_admins",
    "view_security_logs",
    "adjust_commission",
  ]),
};

export function canRolePerform(role: VoraRole, action: RbacAction): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

export function getRolePermissions(role: VoraRole): RbacAction[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

/** Route prefixes each role may access */
export const ROLE_ROUTE_ACCESS: Record<VoraRole, RegExp[]> = {
  visitor: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/freelance"),
    /^\/network\/profile\//,
    /^\/network\/company\//,
    /^\/network\/jobs$/,
    /^\/freelance\/services\//,
    /^\/freelance\/store\//,
  ],
  registered: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/freelance"),
    routePrefix("/network"),
    routePrefix("/profile"),
    routePrefix("/billing"),
    /^\/jobs(\/|$)/,
    /^\/messaging(\/|$)/,
  ],
  professional: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/freelance"),
    routePrefix("/network"),
    routePrefix("/profile"),
    routePrefix("/billing"),
  ],
  company: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/company"),
    routePrefix("/billing"),
    routePrefix("/network/messages"),
    /^\/network\/company\//,
    /^\/network\/jobs(\/|$)/,
    /^\/network\/profile\//,
  ],
  admin: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/admin"),
    routePrefix("/freelance"),
    routePrefix("/network"),
    routePrefix("/profile"),
    routePrefix("/billing"),
  ],
  owner: [
    /^\/$/,
    /^\/auth\//,
    routePrefix("/admin"),
    routePrefix("/billing"),
    routePrefix("/freelance"),
    routePrefix("/network"),
    routePrefix("/company"),
    routePrefix("/profile"),
  ],
};

export function isRouteAllowedForRole(pathname: string, role: VoraRole): boolean {
  const patterns = ROLE_ROUTE_ACCESS[role];
  return patterns.some((p) => p.test(pathname));
}

/** Protected routes requiring authentication */
export const PROTECTED_ROUTE_PREFIXES = [
  "/profile/me",
  "/network/messages",
  "/network/ai",
  "/network/settings",
  "/network/profile/edit",
  "/network/connections",
  "/freelance/dashboard",
  "/freelance/messages",
  "/freelance/orders",
  "/freelance/manage-store",
  "/company/dashboard",
  "/company/onboarding",
  "/billing",
  "/admin",
];

export function requiresAuth(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

export function shouldEnforceRouteRole(_pathname: string): boolean {
  return true;
}

export function getMinimumRoleForRoute(pathname: string): VoraRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/company/dashboard")) return "company";
  if (pathname.startsWith("/network/ai")) return "professional";
  if (pathname.startsWith("/network/messages")) return "registered";
  if (pathname.startsWith("/freelance/dashboard") || pathname.startsWith("/freelance/messages")) return "registered";
  if (pathname.startsWith("/billing")) return "registered";
  return null;
}

const ROLE_HIERARCHY: VoraRole[] = ["visitor", "registered", "professional", "company", "admin", "owner"];

export function roleMeetsMinimum(current: VoraRole, required: VoraRole): boolean {
  if (current === "owner") return true;
  if (required === "admin" && current === "admin") return true;
  if (required === "company" && current === "company") return true;
  if (required === "professional" && current === "professional") return true;
  if (
    required === "registered" &&
    (current === "registered" || current === "professional" || current === "company")
  ) {
    return true;
  }
  return current === required;
}

export function getRestrictionMessageForAction(action: RbacAction, role: VoraRole): string {
  if (canRolePerform(role, action)) return "";
  const messages: Partial<Record<RbacAction, string>> = {
    apply_job: "Upgrade to Professional User to apply for jobs.",
    follow_connect: "Professional User role required for networking.",
    network_message: "Professional User role required for network messaging.",
    engage_content: "Professional User role required to engage with feed content.",
    manage_company: "Company (Employer) role required.",
    manage_ats: "Company (Employer) role required for ATS access.",
    buy_corporate_plan: "Company account required for corporate plans.",
    moderate_content: "Admin role required.",
    view_finance: "Owner role required for financial ledger access.",
    resolve_disputes: "Owner role required for dispute resolution.",
  };
  return messages[action] ?? `Your role (${role}) does not have permission for this action.`;
}

export { ROLE_HIERARCHY };
