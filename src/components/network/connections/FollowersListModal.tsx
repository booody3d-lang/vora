"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FollowListEntry } from "@/lib/network/social-store";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getProfileUrl } from "@/lib/network/urls";
import { useTranslations } from "@/i18n/use-translations";

interface FollowersListModalProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "user" | "company";
  onSelectFollower?: (accountId: string) => void;
}

export function FollowersListModal({
  open,
  onClose,
  targetId,
  targetType,
  onSelectFollower,
}: FollowersListModalProps) {
  const { t } = useTranslations();
  const [followers, setFollowers] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({ targetId, targetType });
        const res = await fetch(`/api/social/followers?${params.toString()}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load followers");
        }
        if (!cancelled) {
          setFollowers(data.followers ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load followers");
          setFollowers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, targetId, targetType]);

  if (!open) return null;

  function handleFollowerClick(accountId: string) {
    if (onSelectFollower) {
      onSelectFollower(accountId);
      onClose();
      return;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("profile.header.close")}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-[#0F172A]">{t("network.connections.followersList.title")}</h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">{t("common.loading")}</p>
          ) : error ? (
            <p className="p-6 text-center text-sm text-red-600">{error}</p>
          ) : followers.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              {t("network.connections.followersList.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {followers.map((entry) => (
                <li key={entry.accountId} className="flex items-center gap-3 p-4">
                  {onSelectFollower ? (
                    <button
                      type="button"
                      onClick={() => handleFollowerClick(entry.accountId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start transition-colors hover:opacity-90"
                    >
                      <UserAvatar name={entry.fullName} className="h-11 w-11 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#0F172A]">{entry.fullName}</p>
                        {entry.headline && (
                          <p className="truncate text-xs text-slate-500">{entry.headline}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[#3B5998]">
                        {t("network.connections.message")}
                      </span>
                    </button>
                  ) : entry.profileSlug ? (
                    <Link
                      href={getProfileUrl(entry.profileSlug)}
                      onClick={onClose}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <UserAvatar name={entry.fullName} className="h-11 w-11 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#0F172A]">{entry.fullName}</p>
                        {entry.headline && (
                          <p className="truncate text-xs text-slate-500">{entry.headline}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <>
                      <UserAvatar name={entry.fullName} className="h-11 w-11 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#0F172A]">{entry.fullName}</p>
                        {entry.headline && (
                          <p className="truncate text-xs text-slate-500">{entry.headline}</p>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#3B5998] py-2 text-sm font-semibold text-white"
          >
            {t("profile.header.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
