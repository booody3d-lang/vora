"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadMediaFile } from "@/lib/media/upload-client";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";
import type {
  Album,
  AlbumPhoto,
  AlbumPhotoComment,
  ContentOwnerType,
  ContentVisibility,
} from "@/types/albums-stories";

interface AlbumsPanelProps {
  ownerType: ContentOwnerType;
  ownerId: string;
  isOwner: boolean;
  /** Accepted follower — required to like/comment even on public albums */
  canInteract: boolean;
}

export function AlbumsPanel({
  ownerType,
  ownerId,
  isOwner,
  canInteract,
}: AlbumsPanelProps) {
  const { t } = useTranslations();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<ContentVisibility>("public");
  const [creating, setCreating] = useState(false);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [comments, setComments] = useState<AlbumPhotoComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/albums?ownerType=${ownerType}&ownerId=${encodeURIComponent(ownerId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load albums");
      setAlbums(data.albums ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setLoading(false);
    }
  }, [ownerId, ownerType]);

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  async function createAlbum() {
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerType, ownerId, title: title.trim(), visibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create album");
      setTitle("");
      setAlbums((prev) => [data.album as Album, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setCreating(false);
    }
  }

  async function openAlbum(albumId: string) {
    setActiveAlbumId(albumId);
    setActivePhoto(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/albums/${albumId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open album");
      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open album");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!activeAlbumId || !isOwner) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadMediaFile(file, "album-photo", { validateVideo: false });
      const res = await fetch(`/api/albums/${activeAlbumId}/photos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploaded.url,
          mimeType: uploaded.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add photo");
      setPhotos((prev) => [...prev, data.photo as AlbumPhoto]);
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === activeAlbumId
            ? {
                ...a,
                photoCount: a.photoCount + 1,
                coverPhotoUrl: a.coverPhotoUrl || uploaded.url,
              }
            : a
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function openPhoto(photo: AlbumPhoto) {
    setActivePhoto(photo);
    setCommentText("");
    const res = await fetch(`/api/albums/photos/${photo.id}/comments`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setComments(data.comments ?? []);
  }

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
    setActivePhoto((prev) =>
      prev
        ? { ...prev, likedByMe: data.liked, likeCount: data.likeCount }
        : prev
    );
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
          : p
      )
    );
  }

  async function sendComment() {
    if (!activePhoto || !commentText.trim()) return;
    if (!canInteract && !isOwner) {
      setError(t("albums.followersOnlyInteract"));
      return;
    }
    const res = await fetch(`/api/albums/photos/${activePhoto.id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("albums.followersOnlyInteract"));
      return;
    }
    setComments((prev) => [...prev, data.comment as AlbumPhotoComment]);
    setCommentText("");
    setActivePhoto((prev) =>
      prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{t("albums.loading")}</p>;
  }

  if (activePhoto) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActivePhoto(null)}
          className="text-sm font-semibold text-[#3B5998] hover:underline"
        >
          ← {t("albums.backToAlbum")}
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto.url}
          alt={activePhoto.caption || t("albums.photo")}
          className="max-h-[420px] w-full rounded-xl object-contain bg-slate-50"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleLike()}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              activePhoto.likedByMe
                ? "bg-[#3B5998] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            ♥ {activePhoto.likeCount}
          </button>
          <span className="text-sm text-slate-500">
            {activePhoto.commentCount} {t("albums.comments")}
          </span>
        </div>
        {!canInteract && !isOwner && (
          <p className="text-xs text-amber-700">{t("albums.followersOnlyInteract")}</p>
        )}
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="font-semibold text-[#0F172A]">{c.authorName}</p>
              <p className="text-slate-600">{c.content}</p>
            </div>
          ))}
        </div>
        {(canInteract || isOwner) && (
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("albums.commentPlaceholder")}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
            />
            <button
              type="button"
              onClick={() => void sendComment()}
              className="rounded-lg bg-[#3B5998] px-3 py-2 text-sm font-semibold text-white"
            >
              {t("albums.comment")}
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (activeAlbumId) {
    const album = albums.find((a) => a.id === activeAlbumId);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveAlbumId(null);
              setPhotos([]);
            }}
            className="text-sm font-semibold text-[#3B5998] hover:underline"
          >
            ← {t("albums.backToAlbums")}
          </button>
          <div>
            <h3 className="text-base font-semibold text-[#0F172A]">{album?.title}</h3>
            <p className="text-xs text-slate-500">
              {album?.visibility === "followers_only"
                ? t("albums.visibilityFollowers")
                : t("albums.visibilityPublic")}
            </p>
          </div>
          {isOwner && (
            <label className="cursor-pointer rounded-lg bg-[#3B5998] px-3 py-1.5 text-sm font-semibold text-white">
              {busy ? "…" : t("albums.addPhoto")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-slate-500">{t("albums.emptyPhotos")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => void openPhoto(photo)}
                className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="mb-2 text-sm font-semibold text-[#0F172A]">{t("albums.create")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("albums.titlePlaceholder")}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
            />
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ContentVisibility)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="public">{t("albums.visibilityPublic")}</option>
              <option value="followers_only">{t("albums.visibilityFollowers")}</option>
            </select>
            <button
              type="button"
              disabled={creating || !title.trim()}
              onClick={() => void createAlbum()}
              className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {creating ? "…" : t("albums.create")}
            </button>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <p className="text-sm text-slate-500">{t("albums.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => void openAlbum(album.id)}
              className="overflow-hidden rounded-xl border border-slate-100 text-start transition hover:border-[#3B5998]/40"
            >
              <div className="aspect-square bg-slate-100">
                {album.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverPhotoUrl}
                    alt={album.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl text-slate-300">
                    ▦
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-[#0F172A]">{album.title}</p>
                <p className="text-[11px] text-slate-500">
                  {album.photoCount} {t("albums.photos")} ·{" "}
                  {album.visibility === "followers_only"
                    ? t("albums.visibilityFollowers")
                    : t("albums.visibilityPublic")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
