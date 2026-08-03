import { NextResponse } from "next/server";

import { getCompanyByAccountId, getCompanySlugForAccount } from "@/lib/company/company-store";
import { getNavigationLinksForUser } from "@/lib/navigation/get-nav-links";
import { isValidPlatform } from "@/lib/navigation/validate";
import {
  getProfileByAccountId,
  getProfileSlugForAccount,
  getStoreSlugForAccount,
  ensureFreelancerStoreForAccount,
} from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadProfileForAccount,
  loadStoreForAccount,
} from "@/lib/supabase/profile-persistence";
import type { PlatformContext } from "@/types/vora";
import type { VoraRole } from "@/types/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platformParam = searchParams.get("platform") ?? "network";
  const platform: PlatformContext = isValidPlatform(platformParam) ? platformParam : "network";

  let role: VoraRole = "visitor";
  let isAuthenticated = false;
  let profileSlug: string | null = null;
  let storeSlug: string | null = null;
  let companySlug: string | null = null;

  try {
    const auth = await getAuthenticatedUser();

    if (auth) {
      isAuthenticated = true;
      role = auth.session.role;

      await ensureSupabaseProfileAndStore(auth.user);
      const profile = await loadProfileForAccount(auth.user.id);
      const store = await loadStoreForAccount(auth.user.id);

      profileSlug = profile?.slug ?? getProfileSlugForAccount(auth.user.id);

      if (role === "company") {
        const company = await getCompanyByAccountId(auth.user.id);
        companySlug = getCompanySlugForAccount(auth.user.id) ?? company?.slug ?? null;
      } else {
        storeSlug = store?.slug ?? getStoreSlugForAccount(auth.user.id);

        if (!storeSlug) {
          ensureFreelancerStoreForAccount(auth.user.id);
          const reloaded = await loadStoreForAccount(auth.user.id);
          storeSlug = reloaded?.slug ?? getStoreSlugForAccount(auth.user.id);
        }

        if (!storeSlug) {
          storeSlug = getProfileByAccountId(auth.user.id)?.freelancerStoreSlug ?? null;
        }
      }
    }
  } catch {
    // Fall back to visitor defaults when auth is unavailable
  }

  const effectivePlatform: PlatformContext = role === "company" ? "network" : platform;

  const { links, source } = await getNavigationLinksForUser({
    platform: effectivePlatform,
    isAuthenticated,
    role,
    profileSlug,
    storeSlug,
    companySlug,
  });

  return NextResponse.json({ links, source, platform: effectivePlatform, role, isAuthenticated });
}
