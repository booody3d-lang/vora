/** Admin sidebar routes — owner-only items hidden for limited admins (see PRODUCTION_ACCOUNTS.md). */

export interface AdminNavItem {
  href: string;
  labelKey: string;
  icon: string;
  ownerOnly?: boolean;
  badge?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", labelKey: "admin.nav.commandCenter", icon: "⬡" },
  { href: "/admin/users", labelKey: "admin.nav.userManagement", icon: "◎" },
  { href: "/admin/subscriptions", labelKey: "admin.nav.subscriptions", icon: "★" },
  { href: "/admin/companies", labelKey: "admin.nav.companyOversight", icon: "🏢" },
  { href: "/admin/verification", labelKey: "admin.nav.verificationDesk", icon: "✓" },
  { href: "/admin/moderation", labelKey: "admin.nav.moderation", icon: "⚑" },
  { href: "/admin/finance", labelKey: "admin.nav.financialSuite", icon: "◈", ownerOnly: true },
  { href: "/admin/disputes", labelKey: "admin.nav.disputeHub", icon: "⚠", ownerOnly: true, badge: true },
  { href: "/admin/security", labelKey: "admin.nav.securityAudit", icon: "⛨", ownerOnly: true },
  { href: "/admin/analytics", labelKey: "admin.nav.analytics", icon: "◉", ownerOnly: true },
  { href: "/admin/ai", labelKey: "admin.nav.predictiveAi", icon: "✨", ownerOnly: true },
];

export const OWNER_ONLY_ADMIN_PREFIXES = [
  "/admin/finance",
  "/admin/billing",
  "/admin/disputes",
  "/admin/security",
  "/admin/analytics",
  "/admin/ai",
] as const;

export function isOwnerOnlyAdminRoute(pathname: string): boolean {
  return OWNER_ONLY_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getAdminNavItems(isOwner: boolean): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
}
