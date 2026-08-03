"use client";

import { usePermissions } from "@/providers/VoraProviders";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getCurrentUserPublicPageUrl } from "@/lib/network/urls";

/** Resolved href for the signed-in user's public page (company page or profile). */
export function usePublicPageHref(): string {
  const { role } = usePermissions();
  const { profileSlug } = useCurrentProfile();
  const { companySlug } = useCurrentCompany();

  return getCurrentUserPublicPageUrl({ role, profileSlug, companySlug });
}
