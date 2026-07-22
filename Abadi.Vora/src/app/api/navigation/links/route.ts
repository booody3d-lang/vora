import { NextResponse } from "next/server";

import { getNavigationLinksForUser } from "@/lib/navigation/get-nav-links";

import { isValidPlatform } from "@/lib/navigation/validate";

import {
  getProfileByAccountId,
  getProfileSlugForAccount,
  getStoreSlugForAccount,
  ensureFreelancerStoreForAccount,
} from "@/lib/profile/profile-store";

import { getAuthenticatedUser } from "@/lib/security/session";

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



  try {

    const auth = await getAuthenticatedUser();

    if (auth) {

      isAuthenticated = true;

      role = auth.session.role;

      profileSlug = getProfileSlugForAccount(auth.user.id);

      storeSlug = getStoreSlugForAccount(auth.user.id);

      if (!storeSlug) {
        const ensured = ensureFreelancerStoreForAccount(auth.user.id);
        storeSlug = ensured?.storeSlug ?? getStoreSlugForAccount(auth.user.id);
      }

      if (!storeSlug) {
        storeSlug = getProfileByAccountId(auth.user.id)?.freelancerStoreSlug ?? null;
      }

    }

  } catch {

    // Fall back to visitor defaults when auth is unavailable

  }



  const { links, source } = await getNavigationLinksForUser({

    platform,

    isAuthenticated,

    role,

    profileSlug,

    storeSlug,

  });



  return NextResponse.json({ links, source, platform, role, isAuthenticated });

}

