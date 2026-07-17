"use client";

import Link from "next/link";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { getFreelanceStoreUrl, getProfileUrl } from "@/lib/network/mock-data";
import type { FullProfessionalProfile } from "@/types/network";

interface MiniProfileCardProps {
  profile: FullProfessionalProfile;
}

export function MiniProfileCard({ profile }: MiniProfileCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link href={getProfileUrl(profile.slug)}>
        <div className="h-14 bg-gradient-to-r from-[#1E293B] to-[#3B5998]" />
        <div className="relative px-4 pb-4">
          <img
            src={profile.profilePhotoUrl}
            alt={profile.fullName}
            className="-mt-8 h-16 w-16 rounded-full border-4 border-white bg-slate-100 object-cover"
          />
          <h2 className="mt-2 truncate text-sm font-bold text-[#0F172A]">{profile.fullName}</h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{profile.headline}</p>
        </div>
      </Link>
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex justify-center">
          <ProfessionalScoreRing
            score={profile.professionalScore}
            size={88}
            strokeWidth={5}
            label="Score"
          />
        </div>
        {profile.hasFreelancerStore && profile.freelancerStoreSlug && (
          <CrossPlatformLink
            type="visit-store"
            href={getFreelanceStoreUrl(profile.freelancerStoreSlug)}
            className="mt-3 w-full justify-center text-xs"
          />
        )}
      </div>
    </div>
  );
}
