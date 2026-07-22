import { NextResponse } from "next/server";
import { stripPrivateProfileFields } from "@/lib/profile/private-fields";
import {
  getSocialProfileContext,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  loadProfileBySlug,
  resolveAccountIdForProfileSlug,
} from "@/lib/supabase/profile-persistence";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const profile = await loadProfileBySlug(slug);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const auth = await getAuthenticatedUser();
  const targetAccountId =
    profile.accountId ?? (await resolveAccountIdForProfileSlug(slug));
  const social = targetAccountId
    ? getSocialProfileContext(auth?.user.id ?? null, targetAccountId)
    : null;

  const publicProfile = stripPrivateProfileFields(profile);

  return NextResponse.json({
    profile: {
      ...publicProfile,
      followerCount: social?.followerCount ?? 0,
      isFollowing: social?.isFollowing ?? false,
      isAccepted: social?.isAccepted ?? false,
      canMessage: social?.canMessage ?? false,
    },
    social,
  });
}
