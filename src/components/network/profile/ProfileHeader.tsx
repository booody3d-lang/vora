"use client";

import { useState } from "react";
import Link from "next/link";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";
import { PremiumBadge } from "@/components/billing/PremiumBadge";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { ConnectButton } from "@/components/network/connections/ConnectButton";
import { FollowButton } from "@/components/network/connections/FollowButton";
import { getCompanyUrl, getFreelanceStoreUrl } from "@/lib/network/mock-data";
import type { FullProfessionalProfile } from "@/types/network";

interface ProfileHeaderProps {
  profile: FullProfessionalProfile;
  isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const [showContact, setShowContact] = useState(false);

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
      </div>

      <div className="relative px-4 pb-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <img
              src={profile.profilePhotoUrl}
              alt={profile.fullName}
              className="-mt-12 h-28 w-28 shrink-0 rounded-full border-4 border-white bg-slate-100 object-cover md:-mt-14 md:h-32 md:w-32"
            />
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] md:text-2xl">
                  {profile.fullName}
                </h1>
                {profile.isVerified && (
                  <span className="rounded-full bg-[#3B5998]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#3B5998]">
                    ✓ Verified
                  </span>
                )}
                {profile.isPremium && <PremiumBadge />}
              </div>
              <p className="mt-1 text-sm text-slate-600">{profile.headline}</p>
              {profile.currentRole && profile.currentCompany && (
                <p className="mt-1 text-sm text-slate-500">
                  {profile.currentRole} at{" "}
                  <Link
                    href={getCompanyUrl(profile.currentCompany.slug)}
                    className="font-medium text-[#3B5998] hover:underline"
                  >
                    {profile.currentCompany.name}
                  </Link>
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">📍 {profile.location}</p>
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
          {!isOwnProfile && (
            <>
              <ConnectButton targetUserId={profile.id} targetName={profile.fullName} />
              <FollowButton targetUserId={profile.id} />
            </>
          )}
          {profile.hasFreelancerStore && profile.freelancerStoreSlug && (
            <CrossPlatformLink
              type="visit-store"
              href={getFreelanceStoreUrl(profile.freelancerStoreSlug)}
            />
          )}
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Contact Info
          </button>
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#3B5998] transition-colors hover:bg-slate-50"
            >
              🌐 Website
            </a>
          )}
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowContact(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-[#0F172A]">Contact Information</h3>
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
