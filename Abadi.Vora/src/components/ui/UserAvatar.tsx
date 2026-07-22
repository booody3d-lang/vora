"use client";

import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { SubscriptionTierBadge } from "@/components/subscription/SubscriptionTierBadge";
import type { UserGender } from "@/types/profile";

interface UserAvatarProps {
  photoUrl?: string | null;
  gender?: UserGender | null;
  name?: string;
  className?: string;
  size?: number;
  tierBadge?: {
    iconUrl?: string;
    iconSvg?: string;
    tierNameEn?: string;
    tierNameAr?: string;
  } | null;
}

export function UserAvatar({
  photoUrl,
  gender,
  name,
  className,
  size,
  tierBadge,
}: UserAvatarProps) {
  const src = resolveAvatarUrl({ photoUrl, gender });
  const style = size ? { width: size, height: size } : undefined;

  return (
    <span className="relative inline-flex shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name ?? "User avatar"}
        className={cn("rounded-full object-cover bg-slate-100", className)}
        style={style}
      />
      {tierBadge && (tierBadge.iconUrl || tierBadge.iconSvg) && (
        <SubscriptionTierBadge
          iconUrl={tierBadge.iconUrl}
          iconSvg={tierBadge.iconSvg}
          title={tierBadge.tierNameEn ?? tierBadge.tierNameAr}
        />
      )}
    </span>
  );
}
