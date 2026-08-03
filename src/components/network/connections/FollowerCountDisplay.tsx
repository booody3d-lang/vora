"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FollowerCountDisplayProps {
  count: number;
  label: string;
  canViewList: boolean;
  onViewList?: () => void;
  viewListLabel: string;
  className?: string;
}

export function FollowerCountDisplay({
  count,
  label,
  canViewList,
  onViewList,
  viewListLabel,
  className,
}: FollowerCountDisplayProps) {
  const text = `${count.toLocaleString()} ${label}`;

  if (canViewList && count > 0 && onViewList) {
    return (
      <button
        type="button"
        onClick={onViewList}
        aria-label={viewListLabel}
        className={cn(
          "mt-1 text-xs text-[#3B5998] underline-offset-2 hover:underline",
          className
        )}
      >
        {text}
      </button>
    );
  }

  return <p className={cn("mt-1 text-xs text-slate-500", className)}>{text}</p>;
}

interface FollowersStatCardProps {
  label: string;
  value: string;
  clickable?: boolean;
  onClick?: () => void;
  viewListLabel?: string;
}

export function FollowersStatCard({
  label,
  value,
  clickable = false,
  onClick,
  viewListLabel,
}: FollowersStatCardProps) {
  const content: ReactNode = (
    <>
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={viewListLabel}
        className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center transition-colors hover:border-[#3B5998]/30 hover:bg-[#3B5998]/5"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
      {content}
    </div>
  );
}
