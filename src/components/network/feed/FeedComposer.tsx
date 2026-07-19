"use client";

import { useRef, useState } from "react";
import type { CreatePostInput } from "@/types/network";
import type { PostMediaItem } from "@/types/network";
import type { PostType } from "@/types/network";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useTranslations } from "@/i18n/use-translations";
import { useGuardedAction } from "@/hooks/useGuardedAction";
import { uploadMediaFile } from "@/lib/media/upload-client";
import { cn } from "@/lib/utils";

const POST_TYPE_KEYS: { type: PostType; labelKey: string; icon: string }[] = [
  { type: "text", labelKey: "network.post", icon: "📝" },
  { type: "image", labelKey: "network.photo", icon: "🖼️" },
  { type: "video", labelKey: "network.video", icon: "🎬" },
  { type: "article", labelKey: "network.article", icon: "📰" },
  { type: "poll", labelKey: "network.poll", icon: "📊" },
];

interface FeedComposerProps {
  onPublish?: (payload: CreatePostInput) => Promise<boolean>;
}

export function FeedComposer({ onPublish }: FeedComposerProps) {
  const { t } = useTranslations();
  const { fullName, avatarUrl, profilePhotoUrl, gender, subscriptionBadge } = useCurrentProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [activeType, setActiveType] = useState<PostType>("text");
  const [expanded, setExpanded] = useState(false);
  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleCoverUrl, setArticleCoverUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({
    action: "engage_content",
  });

  function placeholderForType(type: PostType): string {
    if (type === "poll") return t("network.feedPollPlaceholder");
    if (type === "article") return t("network.feedArticlePlaceholder");
    if (type === "video") return t("network.feed.videoUrlPlaceholder");
    return t("network.feedSharePlaceholder");
  }

  async function uploadFile(file: File): Promise<string> {
    const uploaded = await uploadMediaFile(file, "post-media", {
      validateVideo: activeType === "video",
    });
    const item: PostMediaItem = {
      url: uploaded.url,
      width: uploaded.width,
      height: uploaded.height,
      mimeType: uploaded.mimeType,
      durationSeconds: uploaded.durationSeconds,
    };
    if (activeType === "image") {
      setMediaItems((prev) => [...prev, item]);
    } else if (activeType === "video") {
      setVideoUrl(item.url);
      setMediaItems([item]);
    } else if (activeType === "article") {
      setArticleCoverUrl(item.url);
    }
    return item.url;
  }

  async function handleMediaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function resetComposer() {
    setContent("");
    setMediaItems([]);
    setVideoUrl("");
    setArticleTitle("");
    setArticleCoverUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setError("");
    setExpanded(false);
  }

  function canPublish(): boolean {
    if (activeType === "poll") {
      return (
        pollQuestion.trim().length > 0 &&
        pollOptions.filter((o) => o.trim()).length >= 2
      );
    }
    if (activeType === "article") {
      return articleTitle.trim().length > 0 && content.trim().length > 0;
    }
    if (activeType === "image") {
      return mediaItems.length > 0 || content.trim().length > 0;
    }
    if (activeType === "video") {
      return videoUrl.trim().length > 0 || mediaItems.length > 0 || content.trim().length > 0;
    }
    return content.trim().length > 0;
  }

  async function handlePublish() {
    if (!canPublish()) return;
    if (!execute()) return;

    setPublishing(true);
    setError("");

    const payload: CreatePostInput = {
      type: activeType,
      content: content.trim() || undefined,
    };

    if (activeType === "image") payload.media = mediaItems;
    if (activeType === "video") {
      payload.media =
        mediaItems.length > 0
          ? mediaItems
          : videoUrl.trim()
            ? [{ url: videoUrl.trim() }]
            : undefined;
    }
    if (activeType === "article") {
      payload.articleTitle = articleTitle.trim();
      payload.articleCoverUrl = articleCoverUrl || undefined;
    }
    if (activeType === "poll") {
      payload.pollQuestion = pollQuestion.trim();
      payload.pollOptions = pollOptions
        .filter((o) => o.trim())
        .map((text) => ({ text: text.trim(), votes: 0 }));
      payload.pollExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    }

    try {
      const ok = await onPublish?.(payload);
      if (ok !== false) resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("network.feed.publishFailed"));
    } finally {
      setPublishing(false);
    }
  }

  function openComposer(type: PostType) {
    setActiveType(type);
    setExpanded(true);
    if (type === "image" || type === "video" || type === "article") {
      window.setTimeout(() => fileRef.current?.click(), 0);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#3B5998]";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {VisitorModal}
      <input
        ref={fileRef}
        type="file"
        accept={
          activeType === "video"
            ? "video/mp4,video/webm,video/quicktime"
            : "image/jpeg,image/png,image/webp"
        }
        className="hidden"
        onChange={(e) => void handleMediaFile(e)}
      />
      <input ref={coverRef} type="file" accept="image/*" className="hidden" />

      <div className="flex items-start gap-3 p-4">
        <UserAvatar
          photoUrl={profilePhotoUrl || avatarUrl}
          gender={gender}
          name={fullName}
          tierBadge={subscriptionBadge}
          className="h-12 w-12 shrink-0 border border-slate-200"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-start text-sm text-slate-400 transition-colors hover:border-[#3B5998]/40 hover:bg-slate-50"
        >
          {fullName ? t("network.feed.startPostAs", { name: fullName }) : t("network.startPost")}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {POST_TYPE_KEYS.map(({ type, labelKey, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeType === type
                    ? "bg-[#3B5998] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {icon} {t(labelKey)}
              </button>
            ))}
          </div>

          {activeType === "article" && (
            <input
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              placeholder={t("network.feed.articleTitlePlaceholder")}
              className={cn(fieldClass, "mb-3")}
            />
          )}

          {activeType === "poll" && (
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder={t("network.feedPollPlaceholder")}
              className={cn(fieldClass, "mb-3")}
            />
          )}

          {(activeType === "text" ||
            activeType === "image" ||
            activeType === "article" ||
            activeType === "video") && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholderForType(activeType)}
              rows={4}
              className={fieldClass}
            />
          )}

          {activeType === "video" && (
            <>
              <input
                value={videoUrl}
                onChange={(e) => {
                  const next = e.target.value;
                  setVideoUrl(next);
                  if (next.trim()) {
                    setMediaItems([{ url: next.trim() }]);
                  } else {
                    setMediaItems([]);
                  }
                }}
                placeholder={t("network.feed.videoUrlPlaceholder")}
                className={cn(fieldClass, "mt-3")}
              />
              <p className="mt-2 text-xs text-slate-500">{t("network.feed.videoLimitHint")}</p>
            </>
          )}

          {activeType === "poll" && (
            <div className="mt-3 space-y-2">
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[index] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={t("network.feed.pollOptionPlaceholder", { number: index + 1 })}
                  className={fieldClass}
                />
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  className="text-xs font-medium text-[#3B5998] hover:underline"
                >
                  {t("network.feed.addPollOption")}
                </button>
              )}
            </div>
          )}

          {(activeType === "image" || activeType === "video" || activeType === "article") && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading
                  ? t("profileEdit.uploading")
                  : activeType === "video"
                    ? t("network.feed.uploadVideo")
                    : activeType === "article"
                      ? t("network.feed.uploadCover")
                      : t("network.feed.uploadPhoto")}
              </button>
            </div>
          )}

          {mediaItems.length > 0 && activeType === "image" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mediaItems.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.url}
                  src={item.url}
                  alt=""
                  className="max-h-32 w-full rounded-lg bg-slate-100 object-contain"
                />
              ))}
            </div>
          )}

          {articleCoverUrl && activeType === "article" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={articleCoverUrl}
              alt=""
              className="mt-3 max-h-32 w-full rounded-lg bg-slate-100 object-contain"
            />
          )}

          {(error || restrictionMessage) && (
            <p className="mt-2 text-xs text-amber-600">{error || restrictionMessage}</p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetComposer}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={!canPublish() || publishing || uploading}
              className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {publishing ? t("common.saving") : t("network.publish")}
            </button>
          </div>
        </div>
      )}

      {!expanded && (
        <div className="flex justify-around border-t border-slate-100 py-2">
          {POST_TYPE_KEYS.slice(0, 4).map(({ type, labelKey, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (!execute()) return;
                openComposer(type);
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              {icon} {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
