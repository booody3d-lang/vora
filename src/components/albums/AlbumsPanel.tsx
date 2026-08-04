"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { AlbumPhotoCommentsThread } from "@/components/albums/AlbumPhotoComments";

interface AlbumsPanelProps {
  ownerType: ContentOwnerType;
  ownerId: string;
  isOwner: boolean;
  canInteract: boolean;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#3B5998] focus:ring-2 focus:ring-[#3B5998]/15";

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [comments, setComments] = useState<AlbumPhotoComment[]>([]);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [menuAlbumId, setMenuAlbumId] = useState<string | null>(null);

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

  const activeAlbum = albums.find((a) => a.id === activeAlbumId) ?? null;
  const activePhoto =
    lightboxIndex != null && photos[lightboxIndex] ? photos[lightboxIndex] : null;

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
    setLightboxIndex(null);
    setMenuAlbumId(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/albums/${albumId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open album");
      setPhotos(data.photos ?? []);
      if (data.album) {
        setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...a, ...data.album } : a)));
      }
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
        body: JSON.stringify({ url: uploaded.url, mimeType: uploaded.mimeType }),
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

  async function openLightbox(index: number) {
    setLightboxIndex(index);
    const photo = photos[index];
    if (!photo) return;
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
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
          : p
      )
    );
  }

  function countThread(list: AlbumPhotoComment[]) {
    return list.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
  }

  function handleCommentsChange(next: AlbumPhotoComment[]) {
    if (!activePhoto) {
      setComments(next);
      return;
    }
    const delta = countThread(next) - countThread(comments);
    setComments(next);
    if (delta !== 0) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === activePhoto.id
            ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
            : p
        )
      );
    }
  }

  async function deletePhoto() {
    if (!activePhoto || !isOwner) return;
    if (!confirm(t("albums.confirmDeletePhoto"))) return;
    const res = await fetch(`/api/albums/photos/${activePhoto.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Delete failed");
      return;
    }
    const removedId = activePhoto.id;
    const nextPhotos = photos.filter((p) => p.id !== removedId);
    setPhotos(nextPhotos);
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === activeAlbumId ? { ...a, photoCount: Math.max(0, a.photoCount - 1) } : a
      )
    );
    if (nextPhotos.length === 0) setLightboxIndex(null);
    else setLightboxIndex((i) => Math.min(i ?? 0, nextPhotos.length - 1));
  }

  async function deleteAlbum(albumId: string) {
    if (!isOwner) return;
    if (!confirm(t("albums.confirmDeleteAlbum"))) return;
    const res = await fetch(`/api/albums/${albumId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Delete failed");
      return;
    }
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (activeAlbumId === albumId) {
      setActiveAlbumId(null);
      setPhotos([]);
    }
    setMenuAlbumId(null);
  }

  async function saveRename() {
    if (!activeAlbumId || !renameTitle.trim()) return;
    const res = await fetch(`/api/albums/${activeAlbumId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameTitle.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Rename failed");
      return;
    }
    setAlbums((prev) =>
      prev.map((a) => (a.id === activeAlbumId ? { ...a, title: data.album.title } : a))
    );
    setRenaming(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{t("albums.loading")}</p>;
  }

  /* —— Album detail —— */
  if (activeAlbumId && activeAlbum) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveAlbumId(null);
              setPhotos([]);
              setLightboxIndex(null);
              setRenaming(false);
            }}
            className="text-sm font-semibold text-[#3B5998] hover:underline"
          >
            ← {t("albums.backToAlbums")}
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-start">
            {renaming ? (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className={cn(inputClass, "max-w-xs")}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void saveRename()}
                  className="rounded-lg bg-[#3B5998] px-3 py-2 text-sm font-semibold text-white"
                >
                  {t("albums.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500"
                >
                  {t("albums.cancel")}
                </button>
              </div>
            ) : (
              <>
                <h3 className="truncate text-lg font-bold text-slate-900">{activeAlbum.title}</h3>
                <p className="text-xs text-slate-500">
                  {activeAlbum.photoCount} {t("albums.photos")} ·{" "}
                  {activeAlbum.visibility === "followers_only"
                    ? t("albums.visibilityFollowers")
                    : t("albums.visibilityPublic")}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && !renaming && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenameTitle(activeAlbum.title);
                    setRenaming(true);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("albums.rename")}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAlbum(activeAlbum.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  {t("albums.deleteAlbum")}
                </button>
                <label className="cursor-pointer rounded-lg bg-[#3B5998] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#334f88]">
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
              </>
            )}
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
            <p className="text-sm text-slate-500">{t("albums.emptyPhotos")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => void openLightbox(idx)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-100 transition hover:ring-[#3B5998]/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-start text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  ♥ {photo.likeCount}
                </span>
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {lightboxIndex != null &&
          activePhoto &&
          typeof document !== "undefined" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95">
              <div className="flex items-center justify-between px-4 py-3 text-white">
                <p className="text-sm font-semibold">
                  {lightboxIndex + 1} / {photos.length}
                </p>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => void deletePhoto()}
                      className="rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-semibold"
                    >
                      {t("albums.deletePhoto")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(null)}
                    className="rounded-full bg-white/15 px-3 py-1.5 text-sm"
                  >
                    {t("albums.close")}
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
                <button
                  type="button"
                  disabled={lightboxIndex <= 0}
                  onClick={() => void openLightbox(lightboxIndex - 1)}
                  className="absolute start-2 rounded-full bg-white/15 px-3 py-2 text-white disabled:opacity-30"
                >
                  ‹
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto.url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  disabled={lightboxIndex >= photos.length - 1}
                  onClick={() => void openLightbox(lightboxIndex + 1)}
                  className="absolute end-2 rounded-full bg-white/15 px-3 py-2 text-white disabled:opacity-30"
                >
                  ›
                </button>
              </div>

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
                  </div>
                  <AlbumPhotoCommentsThread
                    photoId={activePhoto.id}
                    comments={comments}
                    canInteract={canInteract}
                    isOwner={isOwner}
                    dark
                    onChange={handleCommentsChange}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  /* —— Album grid —— */
  return (
    <div className="space-y-5">
      {isOwner && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">{t("albums.create")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("albums.titlePlaceholder")}
              className={cn(inputClass, "flex-1")}
            />
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ContentVisibility)}
              className={cn(inputClass, "sm:w-44")}
            >
              <option value="public">{t("albums.visibilityPublic")}</option>
              <option value="followers_only">{t("albums.visibilityFollowers")}</option>
            </select>
            <button
              type="button"
              disabled={creating || !title.trim()}
              onClick={() => void createAlbum()}
              className="rounded-xl bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            >
              {creating ? "…" : t("albums.create")}
            </button>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">{t("albums.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {albums.map((album) => (
            <div
              key={album.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => void openAlbum(album.id)}
                className="block w-full text-start"
              >
                <div className="aspect-square bg-slate-100">
                  {album.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverPhotoUrl}
                      alt={album.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl text-slate-300">
                      ▦
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-slate-900">{album.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {album.photoCount} {t("albums.photos")} ·{" "}
                    {album.visibility === "followers_only"
                      ? t("albums.visibilityFollowers")
                      : t("albums.visibilityPublic")}
                  </p>
                </div>
              </button>
              {isOwner && (
                <div className="absolute end-2 top-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuAlbumId((id) => (id === album.id ? null : album.id))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  >
                    ⋮
                  </button>
                  {menuAlbumId === album.id && (
                    <div className="absolute end-0 top-9 z-10 min-w-[8.5rem] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-100">
                      <button
                        type="button"
                        onClick={() => void openAlbum(album.id)}
                        className="block w-full px-3 py-2 text-start text-sm hover:bg-slate-50"
                      >
                        {t("albums.open")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAlbum(album.id)}
                        className="block w-full px-3 py-2 text-start text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        {t("albums.deleteAlbum")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
