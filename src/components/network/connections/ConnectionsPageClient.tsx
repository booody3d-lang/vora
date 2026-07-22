"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FollowListEntry } from "@/lib/network/social-store";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getProfileUrl } from "@/lib/network/urls";
import { useTranslations } from "@/i18n/use-translations";

type TabKey = "followers" | "following" | "pending";

export function ConnectionsPageClient() {
  const { t } = useTranslations();
  const [tab, setTab] = useState<TabKey>("followers");
  const [followers, setFollowers] = useState<FollowListEntry[]>([]);
  const [following, setFollowing] = useState<FollowListEntry[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadCircle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/circle", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setFollowers(data.followers ?? []);
        setFollowing(data.following ?? []);
        setPendingIncoming(data.pendingIncoming ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCircle();
  }, [loadCircle]);

  async function acceptConnection(followerAccountId: string) {
    setActingOn(followerAccountId);
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", followerAccountId }),
      });
      if (res.ok) await loadCircle();
    } finally {
      setActingOn(null);
    }
  }

  const list =
    tab === "followers" ? followers : tab === "following" ? following : pendingIncoming;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">{t("sidebar.network.connections")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("network.connections.subtitle")}</p>

      <div className="mt-4 flex gap-2 border-b border-slate-200">
        {(["followers", "following", "pending"] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-[#3B5998] text-[#3B5998]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t(`network.connections.tabs.${key}`)}
            {key === "pending" && pendingIncoming.length > 0 && (
              <span className="ms-1 rounded-full bg-[#3B5998] px-1.5 py-0.5 text-[10px] text-white">
                {pendingIncoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-600">{t("network.connections.emptyBody")}</p>
            <Link
              href="/network/search"
              className="mt-4 inline-block rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d4373]"
            >
              {t("network.connections.discover")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((entry) => (
              <li key={entry.accountId} className="flex items-center gap-3 p-4">
                {entry.profileSlug ? (
                  <Link href={getProfileUrl(entry.profileSlug)}>
                    <UserAvatar name={entry.fullName} className="h-12 w-12 border border-slate-200" />
                  </Link>
                ) : (
                  <UserAvatar name={entry.fullName} className="h-12 w-12 border border-slate-200" />
                )}
                <div className="min-w-0 flex-1">
                  {entry.profileSlug ? (
                    <Link
                      href={getProfileUrl(entry.profileSlug)}
                      className="font-semibold text-[#0F172A] hover:underline"
                    >
                      {entry.fullName}
                    </Link>
                  ) : (
                    <p className="font-semibold text-[#0F172A]">{entry.fullName}</p>
                  )}
                  <p className="truncate text-xs text-slate-500">{entry.headline}</p>
                </div>
                {tab === "pending" && (
                  <button
                    type="button"
                    disabled={actingOn === entry.accountId}
                    onClick={() => void acceptConnection(entry.accountId)}
                    className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {actingOn === entry.accountId
                      ? t("common.loading")
                      : t("network.connections.accept")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
