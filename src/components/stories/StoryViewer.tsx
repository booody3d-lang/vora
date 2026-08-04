"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  StoryItem,
  StoryOwnerGroup,
  StoryReactionEmoji,
  StoryViewerRow,
} from "@/types/albums-stories";
import { STORY_REACTION_EMOJI } from "@/types/albums-stories";
import { useTranslations } from "@/i18n/use-translations";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  group: StoryOwnerGroup;
  isOwner?: boolean;
  canInteract?: boolean;
  onClose: () => void;
  onExhausted?: () => void;
  onDeleted?: (storyId: string) => void;
}

export function StoryViewer({
  group,
  isOwner = false,
  canInteract = false,
  onClose,
  onExhausted,
  onDeleted,
}: StoryViewerProps) {
  const { t } = useTranslations();
  const { user } = usePermissions();
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRow[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stories, setStories] = useState(group.stories);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const story: StoryItem | undefined = stories[index];
  const ownStory =
    isOwner ||
    (user?.id && group.ownerType === "user" && group.ownerId === user.id);

  useEffect(() => setMounted(true), []);
  useEffect(() => setStories(group.stories), [group.stories]);

  useEffect(() => {
    if (!story) return;
    void fetch(`/api/stories/${story.id}/view`, {
      method: "POST",
      credentials: "include",
    });
  }, [story?.id]);

  useEffect(() => {
    if (!story || paused || menuOpen || viewersOpen) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const durationMs =
      story.mediaType === "video"
        ? Math.min(15000, Math.max(4000, (story.durationSeconds ?? 5) * 1000))
        : 5500;
    progressRef.current = 0;
    setProgress(0);
    const started = performance.now();

    const tick = (now: number) => {
      const pct = Math.min(1, (now - started) / durationMs);
      progressRef.current = pct;
      setProgress(pct);
      if (pct >= 1) {
        if (index < stories.length - 1) setIndex((i) => i + 1);
        else if (onExhausted) onExhausted();
        else onClose();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [story?.id, index, paused, menuOpen, viewersOpen, stories.length, onClose, onExhausted]);

  async function deleteCurrent() {
    if (!story || !ownStory) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onDeleted?.(story.id);
      const next = stories.filter((s) => s.id !== story.id);
      setMenuOpen(false);
      if (next.length === 0) {
        onClose();
        return;
      }
      setStories(next);
      setIndex((i) => Math.min(i, next.length - 1));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadViewers() {
    if (!story || !ownStory) return;
    setViewersOpen(true);
    setPaused(true);
    const res = await fetch(`/api/stories/${story.id}/viewers`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setViewers(data.viewers ?? []);
  }

  async function react(emoji: StoryReactionEmoji) {
    if (!story) return;
    if (!canInteract && !ownStory) {
      setToast(t("stories.followersOnly"));
      return;
    }
    const next = story.myReaction === emoji ? null : emoji;
    const res = await fetch(`/api/stories/${story.id}/react`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || t("stories.followersOnly"));
      return;
    }
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id
          ? { ...s, reactions: data.reactions, myReaction: data.myReaction }
          : s
      )
    );
  }

  async function sendReply() {
    if (!story || !reply.trim()) return;
    if (!canInteract) {
      setToast(t("stories.followersOnly"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      setReply("");
      setToast(t("stories.replySent"));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !story) return null;

  const reactionKeys = Object.keys(STORY_REACTION_EMOJI) as StoryReactionEmoji[];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-lg flex-col">
        {/* Progress */}
        <div className="absolute inset-x-3 top-[max(0.65rem,env(safe-area-inset-top))] z-30 flex gap-1">
          {stories.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-[max(1.5rem,calc(env(safe-area-inset-top)+0.85rem))] z-30 flex items-center justify-between px-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold drop-shadow">{group.displayName}</p>
            <p className="text-[11px] text-white/70">{t("stories.expiresIn24h")}</p>
          </div>
          <div className="flex items-center gap-1">
            {ownStory && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((v) => !v);
                    setPaused(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-lg backdrop-blur"
                  aria-label="Menu"
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="absolute end-0 top-10 z-40 min-w-[10rem] overflow-hidden rounded-xl bg-white text-slate-800 shadow-xl">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteCurrent()}
                      className="block w-full px-4 py-2.5 text-start text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      {t("stories.delete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadViewers()}
                      className="block w-full px-4 py-2.5 text-start text-sm hover:bg-slate-50"
                    >
                      {t("stories.viewers")} ({story.viewCount ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setPaused(false);
                      }}
                      className="block w-full px-4 py-2.5 text-start text-sm text-slate-500 hover:bg-slate-50"
                    >
                      {t("stories.cancel")}
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-sm backdrop-blur"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nav hit zones */}
        <button
          type="button"
          className="absolute inset-y-0 start-0 z-10 w-1/3"
          aria-label="Previous"
          onClick={() => index > 0 && setIndex((i) => i - 1)}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 z-10 w-1/3"
          aria-label="Next"
          onClick={() => {
            if (index < stories.length - 1) setIndex((i) => i + 1);
            else if (onExhausted) onExhausted();
            else onClose();
          }}
        />

        {/* Media */}
        <div
          className="flex flex-1 items-center justify-center bg-black px-1 pt-14 pb-36"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
        >
          {story.mediaType === "video" ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={story.id}
              src={story.mediaUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {/* Bottom chrome */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          {ownStory && (
            <button
              type="button"
              onClick={() => void loadViewers()}
              className="mb-3 text-xs font-medium text-white/80"
            >
              👁 {story.viewCount ?? 0} {t("stories.views")}
            </button>
          )}

          <div className="mb-3 flex items-center justify-center gap-2">
            {reactionKeys.map((key) => {
              const count = story.reactions?.[key] ?? 0;
              const active = story.myReaction === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void react(key)}
                  className={cn(
                    "flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-lg transition",
                    active ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
                  )}
                  title={key}
                >
                  <span>{STORY_REACTION_EMOJI[key]}</span>
                  {count > 0 && <span className="text-[10px] font-semibold">{count}</span>}
                </button>
              );
            })}
          </div>

          {!ownStory && (
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("stories.replyPlaceholder")}
                disabled={!canInteract || busy}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40"
              />
              <button
                type="button"
                disabled={!reply.trim() || busy || !canInteract}
                onClick={() => void sendReply()}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
              >
                {t("stories.reply")}
              </button>
            </div>
          )}
          {!ownStory && !canInteract && (
            <p className="mt-2 text-center text-[11px] text-white/60">{t("stories.followersOnly")}</p>
          )}
        </div>

        {viewersOpen && (
          <div className="absolute inset-x-0 bottom-0 z-40 max-h-[55%] overflow-hidden rounded-t-3xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="font-semibold">{t("stories.viewers")}</p>
              <button
                type="button"
                onClick={() => {
                  setViewersOpen(false);
                  setPaused(false);
                }}
                className="text-sm text-slate-500"
              >
                {t("stories.close")}
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto p-2">
              {viewers.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  {t("stories.noViewers")}
                </li>
              ) : (
                viewers.map((v) => (
                  <li
                    key={v.accountId}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">{v.displayName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(v.viewedAt).toLocaleString()}
                      </p>
                    </div>
                    {v.reaction && (
                      <span className="text-lg">
                        {STORY_REACTION_EMOJI[v.reaction]}
                      </span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {toast && (
          <div className="absolute inset-x-4 top-24 z-50 rounded-xl bg-white/95 px-3 py-2 text-center text-sm text-slate-800 shadow">
            {toast}
            <button type="button" className="ms-2 text-[#3B5998]" onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
