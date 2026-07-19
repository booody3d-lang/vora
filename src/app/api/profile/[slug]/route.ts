import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/lib/profile/profile-store";
import { stripPrivateProfileFields } from "@/lib/profile/private-fields";
import {
  getAccountIdForProfileSlug,
  getSocialProfileContext,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const profile = getProfileBySlug(slug);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const auth = await getAuthenticatedUser();
  const targetAccountId = profile.accountId ?? getAccountIdForProfileSlug(slug);
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
