import { NextResponse } from "next/server";
import {
  ensureSupabaseProfileAndStore,
  loadProfileForAccount,
  saveProfileForAccount,
} from "@/lib/supabase/profile-persistence";
import type { FullProfessionalProfile } from "@/types/network";
import { pickPrivateUpdates } from "@/lib/profile/private-fields";
import { getSocialProfileContext } from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);

  const profile = await loadProfileForAccount(auth.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const social = await getSocialProfileContext(auth.user.id, auth.user.id);

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
    await ensureSupabaseProfileAndStore(auth.user);

    const body = (await request.json()) as Partial<FullProfessionalProfile> & Record<string, unknown>;
    const privateUpdates = pickPrivateUpdates(body);
    const profile = await saveProfileForAccount(auth.user.id, {
      ...body,
      ...privateUpdates,
    });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("[api/profile PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
