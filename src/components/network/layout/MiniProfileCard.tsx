"use client";

import Link from "next/link";
import { CrossPlatformLink } from "@/components/navigation/DualDashboardToggle";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useTranslations } from "@/i18n/use-translations";
import {
  getCurrentUserProfileUrl,
  getFreelanceStoreUrl,
} from "@/lib/network/urls";

export function MiniProfileCard() {
  const { t } = useTranslations();
  const {
    profile,
    profileSlug,
    storeSlug,
    fullName,
    avatarUrl,
    profilePhotoUrl,
    coverImageUrl,
    gender,
    professionalScore,
    loading,
    subscriptionBadge,
  } = useCurrentProfile();

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-14 animate-pulse bg-slate-200" />
        <div className="px-4 pb-4 pt-0">
          <div className="-mt-8 h-16 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="border-t border-slate-100 px-4 py-6">
          <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!profile || !profileSlug || !fullName) {
    return (
      <div className="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-[#0F172A]">{t("network.profileCard.emptyTitle")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("network.profileCard.emptyBody")}</p>
        <Link
          href="/network/settings/profile"
          className="mt-4 inline-flex rounded-lg bg-[#3B5998] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2d4373]"
        >
          {t("network.profileCard.completeProfile")}
        </Link>
      </div>
    );
  }

  const score = professionalScore;
  const headline = profile.headline;
  const name = fullName;
  const photo = profilePhotoUrl || avatarUrl;
  const cover = coverImageUrl;
  const hasStore = profile.hasFreelancerStore;
  const storeLinkSlug = storeSlug ?? profile.freelancerStoreSlug;

  const coverStyle = cover
    ? { backgroundImage: `url(${cover})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : { background: "linear-gradient(to right, #1E293B, #3B5998)" };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link href={getCurrentUserProfileUrl(profileSlug)}>
        <div className="h-14 bg-cover bg-center" style={coverStyle} />
        <div className="relative px-4 pb-4">
          <UserAvatar
            photoUrl={photo}
            gender={gender ?? profile.gender}
            name={name}
            tierBadge={subscriptionBadge}
            className="-mt-8 h-16 w-16 border-4 border-white"
          />
          <h2 className="mt-2 truncate text-sm font-bold text-[#0F172A]">{name}</h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{headline}</p>
        </div>
      </Link>
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex justify-center">
          <ProfessionalScoreRing
            score={score}
            size={88}
            strokeWidth={5}
            label="Score"
          />
        </div>
        {hasStore && storeLinkSlug && (
          <CrossPlatformLink
            type="visit-store"
            href={getFreelanceStoreUrl(storeLinkSlug)}
            className="mt-3 w-full justify-center text-xs"
          />
        )}
      </div>
    </div>
  );
}
