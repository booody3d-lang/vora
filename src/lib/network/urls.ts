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

