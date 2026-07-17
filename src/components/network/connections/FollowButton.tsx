"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  initiallyFollowing?: boolean;
}

export function FollowButton({ targetUserId, initiallyFollowing = false }: FollowButtonProps) {
  const [following, setFollowing] = useState(initiallyFollowing);

  function toggle() {
    setFollowing(!following);
    console.info(`${following ? "Unfollowed" : "Following"} ${targetUserId}`);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
        following
          ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          : "border-[#3B5998] text-[#3B5998] hover:bg-[#3B5998]/5"
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
