"use client";

import { useCallback, useEffect, useState } from "react";
import type { FollowListEntry } from "@/lib/network/social-store";
import { FollowersListModal } from "@/components/network/connections/FollowersListModal";
import { usePermissions } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface MessagingOwnerFollowersPanelProps {
  compact?: boolean;
  onMessageFollower?: (accountId: string) => void;
}

export function MessagingOwnerFollowersPanel({
  compact = false,
  onMessageFollower,
}: MessagingOwnerFollowersPanelProps) {
  const { t } = useTranslations();
  const { user, isLoading: authLoading } = usePermissions();
  const [followerCount, setFollowerCount] = useState(0);
  const [followers, setFollowers] = useState<FollowListEntry[]>([]);
  const [showModal, setShowModal] = useState(false);

  const accountId = user?.id ?? null;

  const loadFollowers = useCallback(async () => {
    if (!accountId) return;
    try {
      const res = await fetch("/api/social/followers?targetType=user", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        const list = (data.followers ?? []) as FollowListEntry[];
        setFollowers(list);
        setFollowerCount(
          typeof data.followerCount === "number" ? data.followerCount : list.length
        );
      }
    } catch {
      // keep previous count
    }
  }, [accountId]);

  useEffect(() => {
    if (authLoading || !accountId) return;
    void loadFollowers();
  }, [authLoading, accountId, loadFollowers]);

  if (authLoading || !accountId) return null;

  const count = Math.max(followerCount, followers.length);

  function handleMessageFollower(targetAccountId: string) {
    onMessageFollower?.(targetAccountId);
    setShowModal(false);
  }

  return (
    <>
      <div className={cn("shrink-0 border-b border-slate-100 bg-slate-50/80", compact ? "px-3 py-2" : "px-4 py-3")}>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={count === 0}
          aria-label={t("network.connections.followersList.viewFollowers")}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start transition-colors",
            count > 0 ? "hover:bg-white" : "cursor-default opacity-70"
          )}
        >
          <div>
            <p className={cn("font-semibold text-[#0F172A]", compact ? "text-xs" : "text-sm")}>
              {count.toLocaleString()} {t("profile.header.followers")}
            </p>
            {!compact && count > 0 && (
              <p className="text-[11px] text-slate-500">
                {t("network.connections.followersList.messagingHint")}
              </p>
            )}
          </div>
          {count > 0 && (
            <span className="shrink-0 text-xs font-semibold text-[#3B5998]">
              {t("network.connections.followersList.viewFollowers")}
            </span>
          )}
        </button>
      </div>

      <FollowersListModal
        open={showModal}
        onClose={() => setShowModal(false)}
        targetId={accountId}
        targetType="user"
        onSelectFollower={onMessageFollower ? handleMessageFollower : undefined}
      />
    </>
  );
}
