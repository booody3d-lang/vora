"use client";

import { useCallback, useEffect, useState } from "react";
import type { FollowListEntry } from "@/lib/network/social-store";
import { FollowersListModal } from "@/components/network/connections/FollowersListModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
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
  const [expanded, setExpanded] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const accountId = user?.id ?? null;

  const loadFollowers = useCallback(async () => {
    if (!accountId) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        targetId: accountId,
        targetType: "user",
      });
      const res = await fetch(`/api/social/followers?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFollowers(data.followers ?? []);
        setFollowerCount(
          typeof data.followerCount === "number"
            ? data.followerCount
            : (data.followers?.length ?? 0)
        );
      }
    } finally {
      setListLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (authLoading || !accountId) return;
    void loadFollowers();
  }, [authLoading, accountId, loadFollowers]);

  useEffect(() => {
    if (!expanded || compact || !accountId) return;
    void loadFollowers();
  }, [expanded, compact, accountId, loadFollowers]);

  if (authLoading || !accountId) return null;

  function handleToggle() {
    if (compact || followerCount === 0) {
      setShowModal(true);
      return;
    }
    setExpanded((open) => !open);
  }

  function handleMessageFollower(targetAccountId: string) {
    onMessageFollower?.(targetAccountId);
    setExpanded(false);
    setShowModal(false);
  }

  return (
    <>
      <div className={cn("border-b border-slate-100 bg-slate-50/80", compact ? "px-3 py-2" : "px-4 py-3")}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={followerCount === 0}
          aria-label={t("network.connections.followersList.viewFollowers")}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start transition-colors",
            followerCount > 0 ? "hover:bg-white" : "cursor-default opacity-70"
          )}
        >
          <div>
            <p className={cn("font-semibold text-[#0F172A]", compact ? "text-xs" : "text-sm")}>
              {followerCount.toLocaleString()} {t("profile.header.followers")}
            </p>
            {!compact && followerCount > 0 && (
              <p className="text-[11px] text-slate-500">
                {t("network.connections.followersList.messagingHint")}
              </p>
            )}
          </div>
          {followerCount > 0 && (
            <span className="shrink-0 text-xs font-semibold text-[#3B5998]">
              {compact ? t("network.connections.followersList.viewFollowers") : expanded ? "▲" : "▼"}
            </span>
          )}
        </button>

        {!compact && expanded && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white">
            {listLoading ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">{t("common.loading")}</p>
            ) : followers.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                {t("network.connections.followersList.empty")}
              </p>
            ) : (
              <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                {followers.map((entry) => (
                  <li key={entry.accountId}>
                    <button
                      type="button"
                      onClick={() => handleMessageFollower(entry.accountId)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-slate-50"
                    >
                      <UserAvatar
                        name={entry.fullName}
                        className="h-9 w-9 border border-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{entry.fullName}</p>
                        {entry.headline && (
                          <p className="truncate text-[11px] text-slate-500">{entry.headline}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-[#3B5998]">
                        {t("network.connections.message")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
