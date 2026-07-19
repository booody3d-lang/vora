"use client";

import { cn } from "@/lib/utils";

interface SubscriptionTierBadgeProps {
  iconUrl?: string;
  iconSvg?: string;
  className?: string;
  title?: string;
}

export function SubscriptionTierBadge({
  iconUrl,
  iconSvg,
  className,
  title,
}: SubscriptionTierBadgeProps) {
  if (!iconUrl && !iconSvg) return null;

  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm",
        className
      )}
      title={title}
      aria-hidden={!title}
    >
      {iconSvg ? (
        <span
          className="flex h-3 w-3 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      ) : iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className="h-3 w-3 object-contain" />
      ) : null}
    </span>
  );
}
