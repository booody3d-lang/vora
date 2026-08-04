"use client";

import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { compressShortVideo } from "@/lib/media/compress-video";
import { uploadMediaFile, inferMediaType } from "@/lib/media/upload-client";
import { useTranslations } from "@/i18n/use-translations";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";
import type { ContentOwnerType, ContentVisibility, StoryOwnerGroup } from "@/types/albums-stories";

interface StoriesBarProps {
  /** Prefill owner when publishing from company page */
  defaultOwnerType?: ContentOwnerType;
  defaultOwnerId?: string;
  compact?: boolean;
}

export function StoriesBar({
  defaultOwnerType,
  defaultOwnerId,
  compact = false,
}: StoriesBarProps) {
  const { t } = useTranslations();
  const { user, role } = usePermissions();
  const [groups, setGroups] = useState<StoryOwnerGroup[]>([]);
  const [active, setActive] = useState<StoryOwnerGroup | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ContentVisibility>("public");
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(
    defaultOwnerId && defaultOwnerType === "company" ? defaultOwnerId : null
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/stories?mode=feed", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setGroups(data.groups ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (defaultOwnerType === "company" && defaultOwnerId) {
      setResolvedCompanyId(defaultOwnerId);
      return;
    }
    if (role !== "company" || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/company/me", { credentials: "include" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.company?.id) setResolvedCompanyId(String(data.company.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultOwnerId, defaultOwnerType, role, user?.id]);

  const ownerType: ContentOwnerType =
    defaultOwnerType ?? (role === "company" ? "company" : "user");
  const ownerId =
    defaultOwnerId ??
    (ownerType === "company" ? resolvedCompanyId ?? "" : user?.id ?? "");

  async function publishStory(file: File) {
    if (!ownerId || uploading) return;
    setUploading(true);
    setError(null);
    try {
      let uploadFile = file;
      let durationSeconds: number | undefined;
      let mediaType = inferMediaType(file.type, file.name);

      if (file.type.startsWith("video/")) {
        const compressed = await compressShortVideo(file);
        uploadFile = compressed.file;
        durationSeconds = compressed.durationSeconds;
        mediaType = "video";
      } else if (!file.type.startsWith("image/")) {
        throw new Error(t("stories.unsupportedMedia"));
      } else {
        mediaType = "image";
      }

      const uploaded = await uploadMediaFile(uploadFile, "story-media", {
        validateVideo: mediaType === "video",
      });

      const res = await fetch("/api/stories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerType,
          ownerId,
          mediaUrl: uploaded.url,
          mediaType: mediaType === "video" ? "video" : "image",
          mimeType: uploaded.mimeType,
          durationSeconds: uploaded.durationSeconds ?? durationSeconds,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish story");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish story");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F172A]">{t("stories.title")}</p>
        {user && (
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ContentVisibility)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
          >
            <option value="public">{t("stories.visibilityPublic")}</option>
            <option value="followers_only">{t("stories.visibilityFollowers")}</option>
          </select>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {user && ownerId && (
          <label className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 ring-2 ring-dashed ring-slate-300">
              <span className="text-2xl text-[#3B5998]">+</span>
            </span>
            <span className="w-full truncate text-center text-[10px] text-slate-600">
              {uploading ? "…" : t("stories.add")}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void publishStory(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {groups.map((group) => (
          <button
            key={`${group.ownerType}:${group.ownerId}`}
            type="button"
            onClick={() => setActive(group)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span
              className={cn(
                "rounded-full p-[2px]",
                group.hasUnseen
                  ? "bg-gradient-to-tr from-[#F59E0B] via-[#EF4444] to-[#3B5998]"
                  : "bg-slate-200"
              )}
            >
              <UserAvatar
                photoUrl={group.avatarUrl}
                gender={group.gender}
                name={group.displayName}
                className="h-14 w-14 border-2 border-white"
              />
            </span>
            <span className="w-full truncate text-center text-[10px] text-slate-600">
              {group.ownerType === "user" && group.ownerId === user?.id
                ? t("stories.you")
                : group.displayName}
            </span>
          </button>
        ))}

        {!user && groups.length === 0 && (
          <p className="py-4 text-sm text-slate-500">{t("stories.empty")}</p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {active && (
        <StoryViewer
          group={active}
          isOwner={
            (active.ownerType === "user" && active.ownerId === user?.id) ||
            (active.ownerType === "company" &&
              ownerType === "company" &&
              active.ownerId === ownerId)
          }
          canInteract={Boolean(user)}
          onClose={() => setActive(null)}
          onDeleted={(storyId) => {
            setGroups((prev) =>
              prev
                .map((g) => ({
                  ...g,
                  stories: g.stories.filter((s) => s.id !== storyId),
                }))
                .filter((g) => g.stories.length > 0)
            );
          }}
          onExhausted={() => {
            setGroups((prev) =>
              prev.map((g) =>
                g.ownerId === active.ownerId && g.ownerType === active.ownerType
                  ? {
                      ...g,
                      hasUnseen: false,
                      stories: g.stories.map((s) => ({ ...s, viewedByMe: true })),
                    }
                  : g
              )
            );
            setActive(null);
          }}
        />
      )}
    </div>
  );
}
