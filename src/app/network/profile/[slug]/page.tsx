import { notFound } from "next/navigation";
import { ProfileHeader } from "@/components/network/profile/ProfileHeader";
import { ProfileTabs } from "@/components/network/profile/ProfileTabs";
import {
  CURRENT_USER_SLUG,
  DEMO_PROFILES,
} from "@/lib/network/mock-data";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = DEMO_PROFILES[slug];

  if (!profile) {
    notFound();
  }

  const isOwnProfile = slug === CURRENT_USER_SLUG;

  return (
    <div className="mx-auto max-w-[900px] px-4 py-4 md:px-6 md:py-6">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs profile={profile} />
    </div>
  );
}
