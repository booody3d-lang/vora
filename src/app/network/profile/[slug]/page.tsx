import { permanentRedirect, redirect } from "next/navigation";
import { notFound } from "next/navigation";

import { ProfileHeader } from "@/components/network/profile/ProfileHeader";
import { ProfileTabs } from "@/components/network/profile/ProfileTabs";
import { getCompanyByAccountId, getCompanyBySlug } from "@/lib/company/company-store";
import { getCompanyUrl, getProfileUrl } from "@/lib/network/urls";
import { getProfileSlugForAccount, isProfileOwner } from "@/lib/profile/profile-store";
import { stripPrivateProfileFields } from "@/lib/profile/private-fields";
import {
  getRelationship,
  getSocialProfileContext,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadProfileBySlug,
  loadProfileForAccount,
  resolveAccountIdForProfileSlug,
} from "@/lib/supabase/profile-persistence";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;

  const company = await getCompanyBySlug(slug);
  if (company) {
    permanentRedirect(getCompanyUrl(slug));
  }

  const auth = await getAuthenticatedUser();
  if (auth?.user.role === "company") {
    const ownedCompany = await getCompanyByAccountId(auth.user.id);
    if (ownedCompany) {
      redirect(getCompanyUrl(ownedCompany.slug));
    }
    redirect("/company/dashboard");
  }

  let rawProfile = await loadProfileBySlug(slug);

  if (!rawProfile && auth) {
    const ownsSlug =
      isProfileOwner(auth.user.id, slug) ||
      getProfileSlugForAccount(auth.user.id) === slug;
    if (ownsSlug) {
      await ensureSupabaseProfileAndStore(auth.user);
      rawProfile =
        (await loadProfileBySlug(slug)) ?? (await loadProfileForAccount(auth.user.id));
      if (rawProfile && rawProfile.slug !== slug) {
        permanentRedirect(getProfileUrl(rawProfile.slug));
      }
    }
  }

  if (!rawProfile) {
    notFound();
  }

  const isOwnProfile = auth ? isProfileOwner(auth.user.id, slug) : false;
  const targetAccountId =
    rawProfile.accountId ?? (await resolveAccountIdForProfileSlug(slug)) ?? rawProfile.id;
  const socialAccountId = isOwnProfile && auth ? auth.user.id : targetAccountId;
  const social = await getSocialProfileContext(auth?.user.id ?? null, socialAccountId);
  const inbound = auth
    ? await getRelationship(targetAccountId, auth.user.id, "user")
    : null;

  const profile = {
    ...rawProfile,
    ...stripPrivateProfileFields(rawProfile),
    accountId: targetAccountId,
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
