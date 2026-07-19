"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/use-translations";
import { useGuardedAction } from "@/hooks/useGuardedAction";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  targetType?: "user" | "company";
  initiallyFollowing?: boolean;
  initiallyAccepted?: boolean;
}

export function FollowButton({
  targetUserId,
  targetType = "user",
  initiallyFollowing = false,
  initiallyAccepted = false,
}: FollowButtonProps) {
  const { t } = useTranslations();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [accepted, setAccepted] = useState(initiallyAccepted);
  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({
    action: "follow_connect",
    onAllowed: async () => {
      const res = await fetch(
        following ? "/api/social/circle" : "/api/social/circle",
        {
          method: following ? "DELETE" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: targetUserId, targetType }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Follow action failed");
      setFollowing(!following);
      setAccepted(Boolean(data.isAccepted));
    },
  });

  return (
    <>
      {VisitorModal}
      <button
        type="button"
        onClick={() => execute()}
        className={cn(
          "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
          following
            ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            : "border-[#3B5998] text-[#3B5998] hover:bg-[#3B5998]/5"
        )}
        aria-pressed={following}
        data-target={targetUserId}
        data-accepted={accepted}
      >
        {following ? t("network.connections.following") : t("network.connections.follow")}
      </button>
      {restrictionMessage && (
        <p className="mt-1 text-xs text-amber-600">{restrictionMessage}</p>
      )}
    </>
  );
}
