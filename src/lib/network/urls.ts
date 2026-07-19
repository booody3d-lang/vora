export const CURRENT_USER_PROFILE_PATH = "/profile/me";



export function getCurrentUserProfileUrl() {

  return CURRENT_USER_PROFILE_PATH;

}



export function getProfileUrl(slug: string) {

  return `/network/profile/${slug}`;

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

