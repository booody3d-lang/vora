import { resolveProfileNavHref } from "@/lib/network/urls";
import type { NavigationLinkRecord, ResolvedNavigationLink } from "@/types/navigation";
import type { PlatformContext } from "@/types/vora";
import type { VoraRole } from "@/types/security";

const ROLE_RANK: Record<VoraRole, number> = {
  visitor: 0,
  registered: 1,
  professional: 2,
  company: 3,
  admin: 4,
  owner: 5,
};

/** Network sidebar links hidden for company (employer) accounts. */
const COMPANY_HIDDEN_LABEL_KEYS = new Set([
  "nav.voraAi",
  "nav.settings",
  "sidebar.freelance.dashboard",
  "sidebar.freelance.myServices",
  "sidebar.freelance.orders",
  "sidebar.freelance.myStore",
  "storeEdit.editStore",
  "sidebar.freelance.createManageStore",
]);

function meetsRoleRequirement(userRole: VoraRole, minRole: VoraRole | null): boolean {
  if (!minRole) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

const MESSAGING_HREFS = new Set(["/network/messages", "/freelance/messages"]);

export function personalizeNavHref(
  href: string,
  context?: {
    profileSlug?: string | null;
    storeSlug?: string | null;
    companySlug?: string | null;
    role?: VoraRole;
  }
): string {
  const pathOnly = href.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (MESSAGING_HREFS.has(pathOnly)) {
    return href;
  }

  let result = resolveProfileNavHref(href, context?.profileSlug, {
    role: context?.role,
    companySlug: context?.companySlug,
  });
  if (context?.storeSlug) {
    result = result.replace("{storeSlug}", context.storeSlug);
  }
  if (context?.role === "company") {
    if (result === "/network" || result === "/network/") {
      return "/company/dashboard";
    }
    if (result === "/network/jobs") {
      return "/company/dashboard/jobs";
    }
  }
  return result;
}

function isFreelanceNavLink(link: NavigationLinkRecord): boolean {
  return (
    link.platform === "freelance" ||
    link.href.startsWith("/freelance") ||
    (link.labelKey?.startsWith("sidebar.freelance.") ?? false)
  );
}

export function filterNavigationLinks(
  links: NavigationLinkRecord[],
  options: {
    platform: PlatformContext;
    isAuthenticated: boolean;
    role: VoraRole;
    profileSlug?: string | null;
    storeSlug?: string | null;
    companySlug?: string | null;
  }
): ResolvedNavigationLink[] {
  const { platform, isAuthenticated, role, profileSlug, storeSlug, companySlug } = options;

  return links
    .filter((link) => link.isActive && link.platform === platform && link.placement === "sidebar")
    .filter((link) => !link.requiresAuth || isAuthenticated)
    .filter((link) => meetsRoleRequirement(role, link.minRole))
    .filter((link) => role !== "company" || !isFreelanceNavLink(link))
    .filter((link) => role !== "company" || !COMPANY_HIDDEN_LABEL_KEYS.has(link.labelKey ?? ""))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      id: link.id,
      href: personalizeNavHref(link.href, { profileSlug, storeSlug, companySlug, role }),
      icon: link.icon ?? "•",
      labelKey: link.labelKey,
      labelEn: link.labelEn,
      labelAr: link.labelAr,
    }))
    .filter((link) => !link.href.includes("{storeSlug}"))
    .filter((link) => !link.href.includes("{profileSlug}"));
}
