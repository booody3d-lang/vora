"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Album, AlbumPhoto, AlbumPhotoComment } from "@/types/albums-stories";
import type { AlbumFeedEvent } from "@/lib/albums-stories/album-feed-events";
import { AlbumPhotoCommentsThread } from "@/components/albums/AlbumPhotoComments";
import { useTranslations } from "@/i18n/use-translations";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";

interface AlbumFeedCardProps {
  event: AlbumFeedEvent;
  authorName: string;
}

/** Compact album announcement on the home feed — click opens full album viewer. */
export function AlbumFeedCard({ event, authorName }: AlbumFeedCardProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const covers = event.coverUrls?.length
    ? event.coverUrls
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white text-start shadow-sm transition hover:border-[#3B5998]/40 hover:shadow-md"
      >
        <div className="flex items-center gap-3 px-4 pt-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B5998]/10 text-lg text-[#3B5998]">
            ▦
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {t("albums.feedCreated", { name: authorName })}
            </p>
            <p className="truncate text-sm text-slate-600">{event.title}</p>
            <p className="text-[11px] text-slate-400">
              {event.photoCount} {t("albums.photos")} · {t("albums.openAlbum")}
            </p>
          </div>
        </div>

        {covers.length > 0 ? (
          <div
            className={cn(
              "mt-3 grid gap-0.5",
              covers.length === 1 && "grid-cols-1",
              covers.length === 2 && "grid-cols-2",
              covers.length >= 3 && "grid-cols-2"
            )}
          >
            {covers.slice(0, 4).map((url, i) => (
              <div
                key={`${url}-${i}`}
                className={cn(
                  "relative bg-slate-100",
                  covers.length === 1 ? "aspect-[16/10]" : "aspect-square",
                  covers.length === 3 && i === 0 && "row-span-2 aspect-auto min-h-full"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-4 mb-4 mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            {t("albums.emptyPhotos")}
          </div>
        )}
      </button>

      {open && (
        <AlbumViewerModal
          albumId={event.albumId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface AlbumViewerModalProps {
  albumId: string;
  onClose: () => void;
  /** Optional: jump straight to a photo index */
  initialIndex?: number;
}

export function AlbumViewerModal({
  albumId,
  onClose,
  initialIndex = 0,
}: AlbumViewerModalProps) {
  const { t } = useTranslations();
  const { user } = usePermissions();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [index, setIndex] = useState(initialIndex);
  const [comments, setComments] = useState<AlbumPhotoComment[]>([]);
  const [canInteract, setCanInteract] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePhoto = photos[index] ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/albums/${albumId}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        if (cancelled) return;
        setAlbum(data.album as Album);
        setPhotos(data.photos ?? []);
        setCanInteract(Boolean(data.canInteract));
        setIsOwner(Boolean(data.isOwner));
        const start = Math.min(
          Math.max(0, initialIndex),
          Math.max(0, (data.photos?.length ?? 1) - 1)
        );
        setIndex(start);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [albumId, initialIndex]);

  useEffect(() => {
    if (!activePhoto) {
      setComments([]);
      return;
    }
    let cancelled = false;
    async function loadComments() {
      const res = await fetch(`/api/albums/photos/${activePhoto!.id}/comments`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!cancelled && res.ok) setComments(data.comments ?? []);
    }
    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [activePhoto?.id]);

  async function toggleLike() {
    if (!activePhoto) return;
    if (!canInteract && !isOwner) {
      setError(t("albums.followersOnlyInteract"));
      return;
    }
    const res = await fetch(`/api/albums/photos/${activePhoto.id}/like`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("albums.followersOnlyInteract"));
      return;
    }
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
          : p
      )
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{album?.title ?? "…"}</p>
          {!loading && photos.length > 0 && (
            <p className="text-xs text-white/60">
              {index + 1} / {photos.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm"
        >
          {t("albums.close")}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-white/60">
          {t("albums.loading")}
        </div>
      ) : error && !activePhoto ? (
        <div className="flex flex-1 items-center justify-center text-sm text-red-300">
          {error}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-white/50">
          {t("albums.emptyPhotos")}
        </div>
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => setIndex((i) => i - 1)}
              className="absolute start-2 rounded-full bg-white/15 px-3 py-2 text-white disabled:opacity-30"
            >
              ‹
            </button>
            {activePhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePhoto.url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
            <button
              type="button"
              disabled={index >= photos.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              className="absolute end-2 rounded-full bg-white/15 px-3 py-2 text-white disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {activePhoto && (
            <div className="border-t border-white/10 bg-black/80 px-4 py-3 text-white">
              <div className="mx-auto flex max-w-xl flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleLike()}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-semibold",
                      activePhoto.likedByMe ? "bg-white text-slate-900" : "bg-white/15"
                    )}
                  >
                    ♥ {activePhoto.likeCount}
                  </button>
                  <span className="text-sm text-white/70">
                    {activePhoto.commentCount} {t("albums.comments")}
                  </span>
                  {user && !canInteract && !isOwner && (
                    <span className="text-xs text-amber-200">
                      {t("albums.followersOnlyInteract")}
                    </span>
                  )}
                </div>
                <AlbumPhotoCommentsThread
                  photoId={activePhoto.id}
                  comments={comments}
                  canInteract={canInteract}
                  isOwner={isOwner}
                  dark
                  onChange={(next) => {
                    const prevRoots = comments.length;
                    const nextRoots = next.length;
                    const prevReplies = comments.reduce(
                      (n, c) => n + (c.replies?.length ?? 0),
                      0
                    );
                    const nextReplies = next.reduce(
                      (n, c) => n + (c.replies?.length ?? 0),
                      0
                    );
                    const delta = nextRoots + nextReplies - (prevRoots + prevReplies);
                    setComments(next);
                    if (delta !== 0) {
                      setPhotos((ps) =>
                        ps.map((p) =>
                          p.id === activePhoto.id
                            ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
                            : p
                        )
                      );
                    }
                  }}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>,
    document.body
  );
}
