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

function meetsRoleRequirement(userRole: VoraRole, minRole: VoraRole | null): boolean {
  if (!minRole) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

export function personalizeNavHref(
  href: string,
  context?: { profileSlug?: string | null; storeSlug?: string | null }
): string {
  let result = href;
  if (context?.profileSlug) {
    result = result.replace("{profileSlug}", context.profileSlug);
  }
  if (context?.storeSlug) {
    result = result.replace("{storeSlug}", context.storeSlug);
  }
  return result;
}

export function filterNavigationLinks(
  links: NavigationLinkRecord[],
  options: {
    platform: PlatformContext;
    isAuthenticated: boolean;
    role: VoraRole;
    profileSlug?: string | null;
    storeSlug?: string | null;
  }
): ResolvedNavigationLink[] {
  const { platform, isAuthenticated, role, profileSlug, storeSlug } = options;

  return links
    .filter((link) => link.isActive && link.platform === platform && link.placement === "sidebar")
    .filter((link) => !link.requiresAuth || isAuthenticated)
    .filter((link) => meetsRoleRequirement(role, link.minRole))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      id: link.id,
      href: personalizeNavHref(link.href, { profileSlug, storeSlug }),
      icon: link.icon ?? "•",
      labelKey: link.labelKey,
      labelEn: link.labelEn,
      labelAr: link.labelAr,
    }))
    .filter((link) => !link.href.includes("{storeSlug}"));
}
