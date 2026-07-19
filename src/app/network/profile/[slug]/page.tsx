import { notFound } from "next/navigation";

import { ProfileHeader } from "@/components/network/profile/ProfileHeader";
import { ProfileTabs } from "@/components/network/profile/ProfileTabs";
import { isProfileOwner } from "@/lib/profile/profile-store";
import { stripPrivateProfileFields } from "@/lib/profile/private-fields";
import {
  getRelationship,
  getSocialProfileContext,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  loadProfileBySlug,
  resolveAccountIdForProfileSlug,
} from "@/lib/supabase/profile-persistence";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const rawProfile = await loadProfileBySlug(slug);

  if (!rawProfile) {
    notFound();
  }

  const auth = await getAuthenticatedUser();
  const isOwnProfile = auth ? isProfileOwner(auth.user.id, slug) : false;
  const targetAccountId =
    rawProfile.accountId ?? (await resolveAccountIdForProfileSlug(slug)) ?? rawProfile.id;
  const social = getSocialProfileContext(auth?.user.id ?? null, targetAccountId);
  const inbound = auth
    ? getRelationship(targetAccountId, auth.user.id, "user")
    : null;

  const profile = {
    ...stripPrivateProfileFields(rawProfile),
    followerCount: social.followerCount,
    isFollowing: social.isFollowing,
    isAccepted: social.isAccepted,
    canMessage: social.canMessage,
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 py-4 md:px-6 md:py-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        initiallyFollowing={social.isFollowing}
        initiallyAccepted={social.isAccepted}
        hasIncomingPending={inbound?.status === "pending"}
      />
      <ProfileTabs profile={profile} isOwnProfile={isOwnProfile} />
    </div>
  );
}
