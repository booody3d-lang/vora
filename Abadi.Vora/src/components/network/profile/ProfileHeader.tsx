"use client";

import { useState } from "react";
import Link from "next/link";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";
import { PremiumBadge } from "@/components/billing/PremiumBadge";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { ConnectButton } from "@/components/network/connections/ConnectButton";
import { FollowButton } from "@/components/network/connections/FollowButton";
import { MessageButton } from "@/components/network/connections/MessageButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getCompanyUrl, getFreelanceStoreUrl } from "@/lib/network/urls";
import { useLocale } from "@/providers/LocaleProvider";
import type { FullProfessionalProfile } from "@/types/network";

interface ProfileHeaderProps {
  profile: FullProfessionalProfile;
  isOwnProfile?: boolean;
  initiallyFollowing?: boolean;
  initiallyAccepted?: boolean;
  hasIncomingPending?: boolean;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  initiallyFollowing = false,
  initiallyAccepted = false,
  hasIncomingPending = false,
}: ProfileHeaderProps) {
  const [showContact, setShowContact] = useState(false);
  const { t } = useLocale();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-48 bg-gradient-to-r from-[#1E293B] to-[#3B5998] md:h-56">
        {profile.coverImageUrl && (
          <img
            src={profile.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        {isOwnProfile && (
          <Link
            href="/network/profile/edit?section=cover"
            className="absolute end-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#3B5998] shadow-sm hover:bg-white"
          >
            {t("profile.header.editSection")}
          </Link>
        )}
      </div>

      <div className="relative px-4 pb-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <UserAvatar
                photoUrl={profile.profilePhotoUrl}
                gender={profile.gender}
                name={profile.fullName}
                className="-mt-12 h-28 w-28 border-4 border-white md:-mt-14 md:h-32 md:w-32"
              />
              {isOwnProfile && (
                <Link
                  href="/network/profile/edit?section=photo"
                  className="absolute bottom-1 end-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#3B5998] shadow"
                >
                  {t("profile.header.editSection")}
                </Link>
              )}
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] md:text-2xl">
                  {profile.fullName}
                </h1>
                {profile.isVerified && (
                  <span className="rounded-full bg-[#3B5998]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#3B5998]">
                    ✓ {t("profile.header.verified")}
                  </span>
                )}
                {profile.isPremium && <PremiumBadge />}
              </div>
              <p className="mt-1 text-sm text-slate-600">{profile.headline}</p>
              {profile.currentRole && profile.currentCompany && (
                <p className="mt-1 text-sm text-slate-500">
                  {profile.currentRole} {t("profile.header.atCompany")}{" "}
                  <Link
                    href={getCompanyUrl(profile.currentCompany.slug)}
                    className="font-medium text-[#3B5998] hover:underline"
                  >
                    {profile.currentCompany.name}
                  </Link>
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">📍 {profile.location}</p>
              {typeof profile.followerCount === "number" && (
                <p className="mt-1 text-xs text-slate-500">
                  {profile.followerCount.toLocaleString()} {t("profile.header.followers")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ProfessionalScoreRing
              score={profile.professionalScore}
              size={72}
              strokeWidth={5}
              showBadge
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isOwnProfile && (
            <Link
              href="/network/profile/edit"
              className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2d4373]"
            >
              {t("profile.header.editProfile")}
            </Link>
          )}
          {!isOwnProfile && (
            <>
              <ConnectButton
                targetUserId={profile.id}
                targetName={profile.fullName}
                initialStatus={initiallyAccepted ? "accepted" : undefined}
                hasIncomingPending={hasIncomingPending}
              />
              <FollowButton
                targetUserId={profile.id}
                initiallyFollowing={initiallyFollowing}
                initiallyAccepted={initiallyAccepted}
              />
              {profile.canMessage && (
                <MessageButton
                  targetAccountId={profile.id}
                  targetName={profile.fullName}
                />
              )}
            </>
          )}
          {profile.hasFreelancerStore &&
            profile.freelancerStoreSlug &&
            profile.showVisitStoreOnProfile !== false && (
            <CrossPlatformLink
              type="visit-store"
              href={getFreelanceStoreUrl(profile.freelancerStoreSlug)}
              label={t("profile.header.visitMyStore")}
              data-testid="visit-my-store-button"
            />
          )}
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("profile.header.contactInfo")}
          </button>
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#3B5998] transition-colors hover:bg-slate-50"
            >
              🌐 {t("profile.header.website")}
            </a>
          )}
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("profile.header.close")}
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowContact(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-[#0F172A]">{t("profile.header.contactTitle")}</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {profile.contactEmail && <li>✉️ {profile.contactEmail}</li>}
              {profile.contactPhone && <li>📞 {profile.contactPhone}</li>}
              {profile.websiteUrl && (
                <li>
                  🌐{" "}
                  <a href={profile.websiteUrl} className="text-[#3B5998] hover:underline">
                    {profile.websiteUrl}
                  </a>
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setShowContact(false)}
              className="mt-4 w-full rounded-lg bg-[#3B5998] py-2 text-sm font-semibold text-white"
            >
              {t("profile.header.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
