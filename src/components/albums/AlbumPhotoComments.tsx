"use client";

import { useState } from "react";
import type { AlbumPhotoComment, StoryReactionEmoji } from "@/types/albums-stories";
import { STORY_REACTION_EMOJI } from "@/types/albums-stories";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface AlbumPhotoCommentsThreadProps {
  photoId: string;
  comments: AlbumPhotoComment[];
  canInteract: boolean;
  isOwner: boolean;
  onChange: (comments: AlbumPhotoComment[]) => void;
  dark?: boolean;
}

export function AlbumPhotoCommentsThread({
  photoId,
  comments,
  canInteract,
  isOwner,
  onChange,
  dark = false,
}: AlbumPhotoCommentsThreadProps) {
  const { t } = useTranslations();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<AlbumPhotoComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allow = canInteract || isOwner;
  const reactionKeys = Object.keys(STORY_REACTION_EMOJI) as StoryReactionEmoji[];

  async function submit() {
    if (!text.trim() || !allow || busy) return;
    setBusy(true);
    setError(null);
    try {
      // One-level threads (Facebook-style): replies always attach to the root comment.
      const rootParent =
        replyTo == null
          ? null
          : comments.find((c) => c.id === replyTo.id) ??
            comments.find((c) => c.replies?.some((r) => r.id === replyTo.id)) ??
            replyTo;
      const parentId = rootParent?.id ?? null;

      const res = await fetch(`/api/albums/photos/${photoId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text.trim(),
          parentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("albums.followersOnlyInteract"));
      const comment = data.comment as AlbumPhotoComment;
      if (parentId) {
        onChange(
          comments.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), comment] }
              : c
          )
        );
      } else {
        onChange([...comments, { ...comment, replies: [] }]);
      }
      setText("");
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function react(comment: AlbumPhotoComment, emoji: StoryReactionEmoji) {
    if (!allow) {
      setError(t("albums.followersOnlyInteract"));
      return;
    }
    const next = comment.myReaction === emoji ? null : emoji;
    const res = await fetch(`/api/albums/photos/comments/${comment.id}/react`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("albums.followersOnlyInteract"));
      return;
    }

    function patch(c: AlbumPhotoComment): AlbumPhotoComment {
      if (c.id !== comment.id) {
        return {
          ...c,
          replies: c.replies?.map(patch),
        };
      }
      return {
        ...c,
        reactions: data.reactions,
        myReaction: data.myReaction,
        likeCount: data.likeCount,
        likedByMe: Boolean(data.myReaction),
      };
    }
    onChange(comments.map(patch));
  }

  const bubble = dark ? "bg-white/10" : "bg-slate-100";
  const inputCls = dark
    ? "flex-1 rounded-xl border border-white/20 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
    : "flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#3B5998]";

  function CommentNode({
    comment,
    nested = false,
  }: {
    comment: AlbumPhotoComment;
    nested?: boolean;
  }) {
    return (
      <div className={cn("space-y-2", nested && "ms-8")}>
        <div className={cn("rounded-2xl px-3 py-2", bubble)}>
          <p className="text-sm">
            <span className="font-bold">{comment.authorName}</span>{" "}
            <span className={dark ? "text-white/90" : "text-slate-700"}>{comment.content}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            {reactionKeys.slice(0, 4).map((key) => {
              const count = comment.reactions?.[key] ?? 0;
              const active = comment.myReaction === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void react(comment, key)}
                  className={cn(
                    "rounded-full px-1.5 py-0.5",
                    active
                      ? dark
                        ? "bg-white text-slate-900"
                        : "bg-[#3B5998]/15 text-[#3B5998]"
                      : dark
                        ? "text-white/70 hover:bg-white/10"
                        : "text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {STORY_REACTION_EMOJI[key]}
                  {count > 0 ? ` ${count}` : ""}
                </button>
              );
            })}
            {allow && (
              <button
                type="button"
                onClick={() => setReplyTo(comment)}
                className={cn(
                  "font-semibold",
                  dark ? "text-white/70" : "text-[#3B5998]"
                )}
              >
                {t("albums.reply")}
              </button>
            )}
          </div>
        </div>
        {comment.replies?.map((r) => (
          <CommentNode key={r.id} comment={r} nested />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", dark ? "text-white" : "text-slate-800")}>
      <div className="max-h-40 space-y-2 overflow-y-auto sm:max-h-52">
        {comments.length === 0 ? (
          <p className={cn("text-xs", dark ? "text-white/50" : "text-slate-400")}>
            {t("albums.noComments")}
          </p>
        ) : (
          comments.map((c) => <CommentNode key={c.id} comment={c} />)
        )}
      </div>

      {!allow && (
        <p className={cn("text-xs", dark ? "text-amber-200" : "text-amber-700")}>
          {t("albums.followersOnlyInteract")}
        </p>
      )}

      {allow && (
        <div className="space-y-1.5">
          {replyTo && (
            <div className="flex items-center justify-between text-[11px] opacity-80">
              <span>
                {t("albums.replyingTo")} <strong>{replyTo.authorName}</strong>
              </span>
              <button type="button" onClick={() => setReplyTo(null)}>
                {t("albums.cancel")}
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                replyTo ? t("albums.replyPlaceholder") : t("albums.commentPlaceholder")
              }
              className={inputCls}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => void submit()}
              className="rounded-xl bg-[#3B5998] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {replyTo ? t("albums.reply") : t("albums.comment")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
