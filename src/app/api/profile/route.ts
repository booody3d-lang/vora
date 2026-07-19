import { NextResponse } from "next/server";
import {
  getProfileByAccountId,
  getProfileBySlug,
  updateProfileForAccount,
} from "@/lib/profile/profile-store";
import {
  pickPrivateUpdates,
  stripPrivateProfileFields,
} from "@/lib/profile/private-fields";
import {
  getAccountIdForProfileSlug,
  getSocialProfileContext,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { FullProfessionalProfile } from "@/types/network";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = getProfileByAccountId(auth.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const social = getSocialProfileContext(auth.user.id, auth.user.id);

  return NextResponse.json({
    profile: {
      ...profile,
      privateMobileNumber: profile.privateMobileNumber,
      backupEmail: profile.backupEmail,
    },
    circle: {
      followers: social.followerCount,
      following: social.followingCount,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<FullProfessionalProfile> & Record<string, unknown>;
    const privateUpdates = pickPrivateUpdates(body);
    const profile = updateProfileForAccount(auth.user.id, {
      ...body,
      ...privateUpdates,
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
