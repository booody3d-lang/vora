import type { VoraRole } from "@/types/security";

export const CURRENT_USER_PROFILE_PATH = "/profile/me";

/** Canonical public profile route under the Network section. */
export function getProfileUrl(slug: string) {
  return `/network/profile/${slug}`;
}

/**
 * Resolve the current user's profile page. Prefer the slug route so navigation
 * stays inside /network and avoids /profile/me RBAC + redirect hops.
 */
export function getCurrentUserProfileUrl(profileSlug?: string | null) {
  if (profileSlug) {
    return getProfileUrl(profileSlug);
  }
  return CURRENT_USER_PROFILE_PATH;
}

export function getCompanyUrl(slug: string) {
  return `/network/company/${slug}`;
}

/** Public page for the signed-in user — company page for employers, profile otherwise. */
export function getCurrentUserPublicPageUrl(options?: {
  role?: VoraRole | null;
  profileSlug?: string | null;
  companySlug?: string | null;
}): string {
  if (options?.role === "company") {
    if (options.companySlug) return getCompanyUrl(options.companySlug);
    return "/company/dashboard";
  }
  return getCurrentUserProfileUrl(options?.profileSlug);
}

function isProfileNavHref(href: string): boolean {
  return href.includes("{profileSlug}") || /^\/network\/profile\/[^/]+$/.test(href);
}

const COMPANY_SETTINGS_PATH = "/company/dashboard/settings";

function isSettingsNavHref(href: string): boolean {
  return href === "/network/settings" || href.startsWith("/network/settings/");
}

/** Resolve sidebar/API profile nav hrefs; falls back to the current-user alias. */
export function resolveProfileNavHref(
  href: string,
  profileSlug?: string | null,
  options?: { role?: VoraRole | null; companySlug?: string | null }
): string {
  if (options?.role === "company") {
    if (options.companySlug && isProfileNavHref(href)) {
      return getCompanyUrl(options.companySlug);
    }
    if (isSettingsNavHref(href)) {
      return COMPANY_SETTINGS_PATH;
    }
    if (isProfileNavHref(href)) {
      return "/company/dashboard";
    }
  }

  if (profileSlug) {
    if (isProfileNavHref(href)) {
      return getProfileUrl(profileSlug);
    }
    return href;
  }

  if (isProfileNavHref(href)) {
    return CURRENT_USER_PROFILE_PATH;
  }

  return href;
}

export function getFreelanceStoreUrl(storeSlug: string) {
  return `/freelance/store/${storeSlug}`;
}

export function getMessagingUrl(options?: { conversationId?: string; targetAccountId?: string }) {
  const params = new URLSearchParams();

  if (options?.conversationId) params.set("conversation", options.conversationId);

  if (options?.targetAccountId) params.set("with", options.targetAccountId);

  const query = params.toString();

  return query ? `/network/messages?${query}` : "/network/messages";
}
