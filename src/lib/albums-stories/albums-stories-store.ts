import "server-only";

import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCompanyById } from "@/lib/company/company-store";
import { loadProfileForAccount } from "@/lib/supabase/profile-persistence";
import { getProfileByAccountId } from "@/lib/profile/profile-store";
import {
  canInteractWithOwnedContent,
  canViewOwnedContent,
  isOwnerOfContent,
} from "@/lib/albums-stories/access";
import * as sb from "@/lib/albums-stories/albums-stories-supabase";
import type {
  Album,
  AlbumPhoto,
  AlbumPhotoComment,
  ContentOwnerType,
  ContentVisibility,
  CreateAlbumInput,
  CreateStoryInput,
  StoryItem,
  StoryOwnerGroup,
  StoryReactionEmoji,
  StoryViewerRow,
} from "@/types/albums-stories";
import { encodeStoryReply } from "@/lib/albums-stories/story-reply-events";
import { encodeAlbumFeedEvent } from "@/lib/albums-stories/album-feed-events";
import {
  getOrCreateConversation,
  sendMessage,
} from "@/lib/network/messaging-store";
import { createFeedPost, updateFeedPost } from "@/lib/network/feed-store";
import type { MessageAttachment } from "@/types/network";

const ALBUMS_FILE = "albums.json";
const PHOTOS_FILE = "album-photos.json";
const LIKES_FILE = "album-photo-likes.json";
const COMMENTS_FILE = "album-photo-comments.json";
const COMMENT_REACTIONS_FILE = "album-photo-comment-reactions.json";
const STORIES_FILE = "stories.json";
const STORY_VIEWS_FILE = "story-views.json";

interface LikeRow {
  id: string;
  photoId: string;
  accountId: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  photoId: string;
  accountId: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
}

interface CommentReactionRow {
  id: string;
  commentId: string;
  accountId: string;
  emoji: StoryReactionEmoji;
  createdAt: string;
}

interface StoryViewRow {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: string;
}

function readAlbums(): Album[] {
  return readJsonStore<Album[]>(ALBUMS_FILE, () => []);
}
function writeAlbums(rows: Album[]) {
  writeJsonStore(ALBUMS_FILE, rows);
}
function readPhotos(): AlbumPhoto[] {
  return readJsonStore<AlbumPhoto[]>(PHOTOS_FILE, () => []);
}
function writePhotos(rows: AlbumPhoto[]) {
  writeJsonStore(PHOTOS_FILE, rows);
}
function readLikes(): LikeRow[] {
  return readJsonStore<LikeRow[]>(LIKES_FILE, () => []);
}
function writeLikes(rows: LikeRow[]) {
  writeJsonStore(LIKES_FILE, rows);
}
function readComments(): CommentRow[] {
  return readJsonStore<CommentRow[]>(COMMENTS_FILE, () => []);
}
function writeComments(rows: CommentRow[]) {
  writeJsonStore(COMMENTS_FILE, rows);
}
function readCommentReactions(): CommentReactionRow[] {
  return readJsonStore<CommentReactionRow[]>(COMMENT_REACTIONS_FILE, () => []);
}
function writeCommentReactions(rows: CommentReactionRow[]) {
  writeJsonStore(COMMENT_REACTIONS_FILE, rows);
}
function readStories(): StoryItem[] {
  return readJsonStore<StoryItem[]>(STORIES_FILE, () => []);
}
function writeStories(rows: StoryItem[]) {
  writeJsonStore(STORIES_FILE, rows);
}
function readStoryViews(): StoryViewRow[] {
  return readJsonStore<StoryViewRow[]>(STORY_VIEWS_FILE, () => []);
}
function writeStoryViews(rows: StoryViewRow[]) {
  writeJsonStore(STORY_VIEWS_FILE, rows);
}

function enrichPhoto(photo: AlbumPhoto, viewerId?: string | null): AlbumPhoto {
  const likes = readLikes().filter((l) => l.photoId === photo.id);
  const comments = readComments().filter((c) => c.photoId === photo.id);
  return {
    ...photo,
    likeCount: likes.length,
    commentCount: comments.length,
    likedByMe: viewerId ? likes.some((l) => l.accountId === viewerId) : false,
  };
}

async function resolveOwnerMeta(
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<{ displayName: string; avatarUrl?: string; slug?: string; gender?: "male" | "female" | null }> {
  if (ownerType === "company") {
    const company = await getCompanyById(ownerId);
    return {
      displayName: company?.name ?? "Company",
      avatarUrl: company?.logoUrl,
      slug: company?.slug,
      gender: null,
    };
  }
  const profile =
    (await loadProfileForAccount(ownerId)) ?? getProfileByAccountId(ownerId);
  return {
    displayName: profile?.fullName ?? "User",
    avatarUrl: profile?.profilePhotoUrl,
    slug: profile?.slug,
    gender: profile?.gender ?? null,
  };
}

export async function listAlbumsForOwner(
  ownerType: ContentOwnerType,
  ownerId: string,
  viewerId?: string | null
): Promise<Album[]> {
  if (isSupabaseConfigured()) {
    const remote = await sb.listAlbumsInSupabase(ownerType, ownerId);
    if (remote) {
      const visible: Album[] = [];
      for (const album of remote) {
        if (await canViewOwnedContent(viewerId, ownerType, ownerId, album.visibility)) {
          visible.push(album);
        }
      }
      return visible;
    }
  }

  const albums = readAlbums()
    .filter((a) => a.ownerType === ownerType && a.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const photos = readPhotos();
  const visible: Album[] = [];
  for (const album of albums) {
    if (!(await canViewOwnedContent(viewerId, ownerType, ownerId, album.visibility))) continue;
    visible.push({
      ...album,
      photoCount: photos.filter((p) => p.albumId === album.id).length,
    });
  }
  return visible;
}

export async function getAlbumById(albumId: string): Promise<Album | null> {
  if (isSupabaseConfigured()) {
    const remote = await sb.getAlbumInSupabase(albumId);
    if (remote) return remote;
    if (!sb.albumsStoriesTablesMissing()) return null;
  }
  const album = readAlbums().find((a) => a.id === albumId) ?? null;
  if (!album) return null;
  return {
    ...album,
    photoCount: readPhotos().filter((p) => p.albumId === albumId).length,
  };
}

export async function createAlbum(
  input: CreateAlbumInput,
  actorId: string
): Promise<{ ok: true; album: Album } | { ok: false; error: string }> {
  if (!(await isOwnerOfContent(actorId, input.ownerType, input.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  let album: Album | null = null;
  if (isSupabaseConfigured()) {
    album = await sb.createAlbumInSupabase(input);
  }
  if (!album) {
    const now = new Date().toISOString();
    album = {
      id: randomUUID(),
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      title: input.title.trim(),
      visibility: input.visibility,
      photoCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    writeAlbums([album, ...readAlbums()]);
  }

  album = await publishAlbumFeed(album, actorId);
  return { ok: true, album };
}

async function publishAlbumFeed(album: Album, actorId: string): Promise<Album> {
  const photoRows =
    (isSupabaseConfigured()
      ? await sb.listAlbumPhotosInSupabase(album.id, actorId)
      : null) ??
    readPhotos()
      .filter((p) => p.albumId === album.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const coverUrls = photoRows.slice(0, 4).map((p) => p.url);
  const content = encodeAlbumFeedEvent({
    albumId: album.id,
    ownerType: album.ownerType,
    ownerId: album.ownerId,
    title: album.title,
    visibility: album.visibility,
    coverUrls,
    photoCount: photoRows.length,
  });
  const media = coverUrls.map((url) => ({ url }));

  try {
    if (album.feedPostId) {
      await updateFeedPost(actorId, album.feedPostId, {
        type: media.length ? "image" : "text",
        content,
        media: media.length ? media : undefined,
        mediaUrls: coverUrls,
      });
      return album;
    }

    const post = await createFeedPost(actorId, {
      type: media.length ? "image" : "text",
      content,
      media: media.length ? media : undefined,
      mediaUrls: coverUrls,
    });
    if (!post) return album;

    if (isSupabaseConfigured()) {
      const updated = await sb.updateAlbumInSupabase(album.id, { feedPostId: post.id });
      if (updated) return updated;
    }
    const rows = readAlbums();
    const idx = rows.findIndex((a) => a.id === album.id);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], feedPostId: post.id };
      writeAlbums(rows);
      return rows[idx];
    }
    return { ...album, feedPostId: post.id };
  } catch {
    return album;
  }
}

export async function updateAlbum(
  albumId: string,
  actorId: string,
  patch: Partial<{ title: string; visibility: ContentVisibility }>
): Promise<{ ok: true; album: Album } | { ok: false; error: string }> {
  const album = await getAlbumById(albumId);
  if (!album) return { ok: false, error: "Album not found" };
  if (!(await isOwnerOfContent(actorId, album.ownerType, album.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.updateAlbumInSupabase(albumId, patch);
    if (remote) return { ok: true, album: remote };
  }

  const rows = readAlbums();
  const idx = rows.findIndex((a) => a.id === albumId);
  if (idx < 0) return { ok: false, error: "Album not found" };
  rows[idx] = {
    ...rows[idx],
    title: patch.title?.trim() || rows[idx].title,
    visibility: patch.visibility ?? rows[idx].visibility,
    updatedAt: new Date().toISOString(),
  };
  writeAlbums(rows);
  return { ok: true, album: rows[idx] };
}

export async function deleteAlbum(
  albumId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const album = await getAlbumById(albumId);
  if (!album) return { ok: false, error: "Album not found" };
  if (!(await isOwnerOfContent(actorId, album.ownerType, album.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const ok = await sb.deleteAlbumInSupabase(albumId);
    if (ok) {
      // also clean local mirrors if any
    }
  }

  writeAlbums(readAlbums().filter((a) => a.id !== albumId));
  const photoIds = new Set(
    readPhotos().filter((p) => p.albumId === albumId).map((p) => p.id)
  );
  writePhotos(readPhotos().filter((p) => p.albumId !== albumId));
  writeLikes(readLikes().filter((l) => !photoIds.has(l.photoId)));
  writeComments(readComments().filter((c) => !photoIds.has(c.photoId)));
  return { ok: true };
}

export async function listAlbumPhotos(
  albumId: string,
  viewerId?: string | null
): Promise<{ ok: true; photos: AlbumPhoto[]; album: Album } | { ok: false; error: string }> {
  const album = await getAlbumById(albumId);
  if (!album) return { ok: false, error: "Album not found" };
  if (!(await canViewOwnedContent(viewerId, album.ownerType, album.ownerId, album.visibility))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.listAlbumPhotosInSupabase(albumId, viewerId);
    if (remote) return { ok: true, photos: remote, album };
  }

  const photos = readPhotos()
    .filter((p) => p.albumId === albumId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
    .map((p) => enrichPhoto(p, viewerId));
  return { ok: true, photos, album };
}

export async function addAlbumPhoto(
  albumId: string,
  actorId: string,
  input: { url: string; caption?: string; mimeType?: string }
): Promise<{ ok: true; photo: AlbumPhoto } | { ok: false; error: string }> {
  const album = await getAlbumById(albumId);
  if (!album) return { ok: false, error: "Album not found" };
  if (!(await isOwnerOfContent(actorId, album.ownerType, album.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }

  let photo: AlbumPhoto | null = null;
  if (isSupabaseConfigured()) {
    photo = await sb.addAlbumPhotoInSupabase({ albumId, ...input });
  }
  if (!photo) {
    const photos = readPhotos();
    photo = {
      id: randomUUID(),
      albumId,
      url: input.url,
      caption: input.caption,
      mimeType: input.mimeType,
      sortOrder: photos.filter((p) => p.albumId === albumId).length,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    };
    writePhotos([...photos, photo]);
    const albums = readAlbums();
    const idx = albums.findIndex((a) => a.id === albumId);
    if (idx >= 0) {
      if (!albums[idx].coverPhotoUrl) albums[idx].coverPhotoUrl = input.url;
      albums[idx].updatedAt = new Date().toISOString();
      writeAlbums(albums);
    }
  }

  const fresh = (await getAlbumById(albumId)) ?? album;
  await publishAlbumFeed(fresh, actorId);
  return { ok: true, photo };
}

export async function deleteAlbumPhoto(
  photoId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let album: Album | null = null;
  let photoAlbumId: string | null = null;

  if (isSupabaseConfigured()) {
    const remotePhoto = await sb.getAlbumPhotoInSupabase(photoId);
    if (remotePhoto) {
      photoAlbumId = remotePhoto.albumId;
      album = await getAlbumById(remotePhoto.albumId);
    }
  }
  if (!album) {
    const local = readPhotos().find((p) => p.id === photoId);
    if (!local) return { ok: false, error: "Photo not found" };
    photoAlbumId = local.albumId;
    album = await getAlbumById(local.albumId);
  }
  if (!album || !photoAlbumId) return { ok: false, error: "Photo not found" };
  if (!(await isOwnerOfContent(actorId, album.ownerType, album.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) await sb.deleteAlbumPhotoInSupabase(photoId);
  writePhotos(readPhotos().filter((p) => p.id !== photoId));
  writeLikes(readLikes().filter((l) => l.photoId !== photoId));
  writeComments(readComments().filter((c) => c.photoId !== photoId));
  return { ok: true };
}

async function resolvePhotoOwner(
  photoId: string
): Promise<{ album: Album; photoId: string } | null> {
  if (isSupabaseConfigured()) {
    const remote = await sb.getAlbumPhotoInSupabase(photoId);
    if (remote) {
      const album = await getAlbumById(remote.albumId);
      if (album) return { album, photoId };
    }
  }
  const local = readPhotos().find((p) => p.id === photoId);
  if (!local) return null;
  const album = await getAlbumById(local.albumId);
  if (!album) return null;
  return { album, photoId };
}

export async function toggleAlbumPhotoLike(
  photoId: string,
  actorId: string
): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  const resolved = await resolvePhotoOwner(photoId);
  if (!resolved) return { ok: false, error: "Photo not found" };
  const { album } = resolved;

  if (!(await canViewOwnedContent(actorId, album.ownerType, album.ownerId, album.visibility))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!(await canInteractWithOwnedContent(actorId, album.ownerType, album.ownerId))) {
    return {
      ok: false,
      error: "Only followers can like album photos",
    };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.toggleAlbumPhotoLikeInSupabase(photoId, actorId);
    if (remote) return { ok: true, ...remote };
  }

  const likes = readLikes();
  const existing = likes.find((l) => l.photoId === photoId && l.accountId === actorId);
  if (existing) {
    writeLikes(likes.filter((l) => l.id !== existing.id));
  } else {
    writeLikes([
      ...likes,
      { id: randomUUID(), photoId, accountId: actorId, createdAt: new Date().toISOString() },
    ]);
  }
  const likeCount = readLikes().filter((l) => l.photoId === photoId).length;
  return { ok: true, liked: !existing, likeCount };
}

export async function listAlbumPhotoComments(
  photoId: string,
  viewerId?: string | null
): Promise<{ ok: true; comments: AlbumPhotoComment[] } | { ok: false; error: string }> {
  const resolved = await resolvePhotoOwner(photoId);
  if (!resolved) return { ok: false, error: "Photo not found" };
  const { album } = resolved;
  if (!(await canViewOwnedContent(viewerId, album.ownerType, album.ownerId, album.visibility))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.listAlbumPhotoCommentsInSupabase(photoId, viewerId);
    if (remote) return { ok: true, comments: remote };
  }

  const all = readComments().filter((c) => c.photoId === photoId);
  const reactions = readCommentReactions().filter((r) =>
    all.some((c) => c.id === r.commentId)
  );
  const flat: AlbumPhotoComment[] = [];
  for (const row of all) {
    const meta = await resolveOwnerMeta("user", row.accountId);
    const mine = reactions.filter((r) => r.commentId === row.id);
    const counts: NonNullable<AlbumPhotoComment["reactions"]> = {};
    for (const r of mine) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }
    flat.push({
      id: row.id,
      photoId: row.photoId,
      accountId: row.accountId,
      authorName: meta.displayName,
      authorPhotoUrl: meta.avatarUrl,
      content: row.content,
      createdAt: row.createdAt,
      parentId: row.parentId ?? null,
      likeCount: mine.length,
      likedByMe: viewerId ? mine.some((r) => r.accountId === viewerId) : false,
      myReaction: viewerId
        ? mine.find((r) => r.accountId === viewerId)?.emoji ?? null
        : null,
      reactions: counts,
      replies: [],
    });
  }
  const roots = flat.filter((c) => !c.parentId);
  for (const root of roots) {
    root.replies = flat.filter((c) => c.parentId === root.id);
  }
  return { ok: true, comments: roots };
}

export async function addAlbumPhotoComment(
  photoId: string,
  actorId: string,
  content: string,
  parentId?: string | null
): Promise<{ ok: true; comment: AlbumPhotoComment } | { ok: false; error: string }> {
  const resolved = await resolvePhotoOwner(photoId);
  if (!resolved) return { ok: false, error: "Photo not found" };
  const { album } = resolved;

  if (!(await canViewOwnedContent(actorId, album.ownerType, album.ownerId, album.visibility))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!(await canInteractWithOwnedContent(actorId, album.ownerType, album.ownerId))) {
    return { ok: false, error: "Only followers can comment on album photos" };
  }
  if (!content.trim()) return { ok: false, error: "Comment is required" };

  if (isSupabaseConfigured()) {
    const remote = await sb.addAlbumPhotoCommentInSupabase({
      photoId,
      accountId: actorId,
      content,
      parentId,
    });
    if (remote) return { ok: true, comment: remote };
  }

  const row: CommentRow = {
    id: randomUUID(),
    photoId,
    accountId: actorId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    parentId: parentId ?? null,
  };
  writeComments([...readComments(), row]);
  const meta = await resolveOwnerMeta("user", actorId);
  return {
    ok: true,
    comment: {
      id: row.id,
      photoId,
      accountId: actorId,
      authorName: meta.displayName,
      authorPhotoUrl: meta.avatarUrl,
      content: row.content,
      createdAt: row.createdAt,
      parentId: row.parentId,
      likeCount: 0,
      likedByMe: false,
      myReaction: null,
      reactions: {},
      replies: [],
    },
  };
}

export async function setAlbumPhotoCommentReaction(
  commentId: string,
  actorId: string,
  emoji: StoryReactionEmoji | null
): Promise<
  | {
      ok: true;
      reactions: NonNullable<AlbumPhotoComment["reactions"]>;
      myReaction: AlbumPhotoComment["myReaction"];
      likeCount: number;
    }
  | { ok: false; error: string }
> {
  let photoId = readComments().find((c) => c.id === commentId)?.photoId ?? null;
  if (!photoId && isSupabaseConfigured()) {
    photoId = await sb.getAlbumPhotoIdForCommentInSupabase(commentId);
  }
  if (!photoId) return { ok: false, error: "Comment not found" };

  const resolved = await resolvePhotoOwner(photoId);
  if (!resolved) return { ok: false, error: "Comment not found" };
  if (
    !(await canInteractWithOwnedContent(actorId, resolved.album.ownerType, resolved.album.ownerId))
  ) {
    return { ok: false, error: "Only followers can react to comments" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.setAlbumPhotoCommentReactionInSupabase(commentId, actorId, emoji);
    if (remote) return { ok: true, ...remote };
  }

  let rows = readCommentReactions().filter(
    (r) => !(r.commentId === commentId && r.accountId === actorId)
  );
  if (emoji) {
    rows = [
      ...rows,
      {
        id: randomUUID(),
        commentId,
        accountId: actorId,
        emoji,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  writeCommentReactions(rows);
  const onComment = rows.filter((r) => r.commentId === commentId);
  const counts: NonNullable<AlbumPhotoComment["reactions"]> = {};
  for (const r of onComment) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  return {
    ok: true,
    reactions: counts,
    myReaction: emoji,
    likeCount: onComment.length,
  };
}

function isStoryActive(story: StoryItem): boolean {
  return new Date(story.expiresAt).getTime() > Date.now();
}

export async function createStory(
  input: CreateStoryInput,
  actorId: string
): Promise<{ ok: true; story: StoryItem } | { ok: false; error: string }> {
  if (!(await isOwnerOfContent(actorId, input.ownerType, input.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!input.mediaUrl) return { ok: false, error: "Media is required" };
  if (
    input.mediaType === "video" &&
    input.durationSeconds != null &&
    input.durationSeconds > 15
  ) {
    return { ok: false, error: "Story videos must be 15 seconds or less" };
  }

  if (isSupabaseConfigured()) {
    await sb.purgeExpiredStoriesInSupabase();
    const remote = await sb.createStoryInSupabase(input);
    if (remote) return { ok: true, story: remote };
  }

  const createdAt = new Date();
  const story: StoryItem = {
    id: randomUUID(),
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
    visibility: input.visibility,
    expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: createdAt.toISOString(),
    viewedByMe: false,
  };
  writeStories([story, ...readStories().filter(isStoryActive)]);
  return { ok: true, story };
}

export async function listActiveStoriesForOwner(
  ownerType: ContentOwnerType,
  ownerId: string,
  viewerId?: string | null
): Promise<StoryItem[]> {
  if (isSupabaseConfigured()) {
    const remote = await sb.listActiveStoriesForOwnerInSupabase(ownerType, ownerId, viewerId);
    if (remote) {
      const visible: StoryItem[] = [];
      for (const story of remote) {
        if (await canViewOwnedContent(viewerId, ownerType, ownerId, story.visibility)) {
          visible.push(await enrichStory(story, viewerId));
        }
      }
      return visible;
    }
  }

  const stories = readStories()
    .filter(
      (s) => s.ownerType === ownerType && s.ownerId === ownerId && isStoryActive(s)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const visible: StoryItem[] = [];
  for (const story of stories) {
    if (!(await canViewOwnedContent(viewerId, ownerType, ownerId, story.visibility))) continue;
    visible.push(await enrichStory(story, viewerId));
  }
  return visible;
}

export async function listStoriesFeed(viewerId?: string | null): Promise<StoryOwnerGroup[]> {
  if (isSupabaseConfigured()) {
    await sb.purgeExpiredStoriesInSupabase();
  }

  let stories: StoryItem[] = [];
  if (isSupabaseConfigured()) {
    const remote = await sb.listActiveStoriesFeedInSupabase(viewerId);
    if (remote) stories = remote;
  }
  if (!stories.length) {
    const views = readStoryViews();
    stories = readStories()
      .filter(isStoryActive)
      .map((s) => ({
        ...s,
        viewedByMe: viewerId
          ? views.some((v) => v.storyId === s.id && v.viewerId === viewerId)
          : false,
      }));
  }

  const byOwner = new Map<string, StoryItem[]>();
  for (const story of stories) {
    if (!(await canViewOwnedContent(viewerId, story.ownerType, story.ownerId, story.visibility))) {
      continue;
    }
    const key = `${story.ownerType}:${story.ownerId}`;
    const list = byOwner.get(key) ?? [];
    list.push(story);
    byOwner.set(key, list);
  }

  const groups: StoryOwnerGroup[] = [];
  for (const [, ownerStories] of byOwner) {
    ownerStories.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const first = ownerStories[0];
    const meta = await resolveOwnerMeta(first.ownerType, first.ownerId);
    groups.push({
      ownerType: first.ownerType,
      ownerId: first.ownerId,
      displayName: meta.displayName,
      avatarUrl: meta.avatarUrl,
      slug: meta.slug,
      gender: meta.gender,
      hasUnseen: ownerStories.some((s) => !s.viewedByMe),
      stories: ownerStories,
    });
  }

  // Own stories first, then unseen, then recent
  groups.sort((a, b) => {
    const aOwn = viewerId && a.ownerType === "user" && a.ownerId === viewerId ? 1 : 0;
    const bOwn = viewerId && b.ownerType === "user" && b.ownerId === viewerId ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLatest = a.stories[a.stories.length - 1]?.createdAt ?? "";
    const bLatest = b.stories[b.stories.length - 1]?.createdAt ?? "";
    return bLatest.localeCompare(aLatest);
  });

  return groups;
}

export async function deleteStory(
  storyId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let story: StoryItem | null = null;
  if (isSupabaseConfigured()) {
    story = await sb.getStoryInSupabase(storyId);
  }
  if (!story) story = readStories().find((s) => s.id === storyId) ?? null;
  if (!story) return { ok: false, error: "Story not found" };
  if (!(await isOwnerOfContent(actorId, story.ownerType, story.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }
  if (isSupabaseConfigured()) await sb.deleteStoryInSupabase(storyId);
  writeStories(readStories().filter((s) => s.id !== storyId));
  writeStoryViews(readStoryViews().filter((v) => v.storyId !== storyId));
  writeReactions(readReactions().filter((r) => r.storyId !== storyId));
  return { ok: true };
}

export async function recordStoryView(
  storyId: string,
  viewerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let story: StoryItem | null = null;
  if (isSupabaseConfigured()) {
    story = await sb.getStoryInSupabase(storyId);
  }
  if (!story) story = readStories().find((s) => s.id === storyId) ?? null;
  if (!story || !isStoryActive(story)) return { ok: false, error: "Story not found" };
  if (!(await canViewOwnedContent(viewerId, story.ownerType, story.ownerId, story.visibility))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    await sb.recordStoryViewInSupabase(storyId, viewerId);
  }
  const views = readStoryViews();
  if (!views.some((v) => v.storyId === storyId && v.viewerId === viewerId)) {
    writeStoryViews([
      ...views,
      {
        id: randomUUID(),
        storyId,
        viewerId,
        viewedAt: new Date().toISOString(),
      },
    ]);
  }
  return { ok: true };
}

export async function ownerHasActiveStory(
  ownerType: ContentOwnerType,
  ownerId: string,
  viewerId?: string | null
): Promise<boolean> {
  const stories = await listActiveStoriesForOwner(ownerType, ownerId, viewerId);
  return stories.length > 0;
}

const REACTIONS_FILE = "story-reactions.json";

interface StoryReactionRow {
  id: string;
  storyId: string;
  accountId: string;
  emoji: StoryReactionEmoji;
  createdAt: string;
}

function readReactions(): StoryReactionRow[] {
  return readJsonStore<StoryReactionRow[]>(REACTIONS_FILE, () => []);
}
function writeReactions(rows: StoryReactionRow[]) {
  writeJsonStore(REACTIONS_FILE, rows);
}

async function getStoryForActor(storyId: string): Promise<StoryItem | null> {
  if (isSupabaseConfigured()) {
    const remote = await sb.getStoryInSupabase(storyId);
    if (remote) return remote;
  }
  return readStories().find((s) => s.id === storyId) ?? null;
}

export async function enrichStory(
  story: StoryItem,
  viewerId?: string | null
): Promise<StoryItem> {
  if (isSupabaseConfigured()) {
    const remote = await sb.enrichStoryEngagementInSupabase(story, viewerId);
    if (remote.viewCount != null || remote.reactions) return remote;
  }
  const views = readStoryViews().filter((v) => v.storyId === story.id);
  const reactions = readReactions().filter((r) => r.storyId === story.id);
  const counts: NonNullable<StoryItem["reactions"]> = {};
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  }
  return {
    ...story,
    viewCount: views.length,
    reactions: counts,
    myReaction: viewerId
      ? reactions.find((r) => r.accountId === viewerId)?.emoji ?? null
      : null,
    viewedByMe: viewerId
      ? views.some((v) => v.viewerId === viewerId)
      : story.viewedByMe,
  };
}

export async function setStoryReaction(
  storyId: string,
  actorId: string,
  emoji: StoryReactionEmoji | null
): Promise<
  | { ok: true; reactions: NonNullable<StoryItem["reactions"]>; myReaction: StoryItem["myReaction"] }
  | { ok: false; error: string }
> {
  const story = await getStoryForActor(storyId);
  if (!story || !isStoryActive(story)) return { ok: false, error: "Story not found" };
  if (!(await canViewOwnedContent(actorId, story.ownerType, story.ownerId, story.visibility))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!(await canInteractWithOwnedContent(actorId, story.ownerType, story.ownerId))) {
    return { ok: false, error: "Only followers can react to stories" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.setStoryReactionInSupabase(storyId, actorId, emoji);
    if (remote) return { ok: true, ...remote };
  }

  let rows = readReactions().filter(
    (r) => !(r.storyId === storyId && r.accountId === actorId)
  );
  if (emoji) {
    rows = [
      ...rows,
      {
        id: randomUUID(),
        storyId,
        accountId: actorId,
        emoji,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  writeReactions(rows);
  const counts: NonNullable<StoryItem["reactions"]> = {};
  for (const r of rows.filter((x) => x.storyId === storyId)) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  }
  return { ok: true, reactions: counts, myReaction: emoji };
}

export async function listStoryViewers(
  storyId: string,
  actorId: string
): Promise<{ ok: true; viewers: StoryViewerRow[] } | { ok: false; error: string }> {
  const story = await getStoryForActor(storyId);
  if (!story) return { ok: false, error: "Story not found" };
  if (!(await isOwnerOfContent(actorId, story.ownerType, story.ownerId))) {
    return { ok: false, error: "Forbidden" };
  }

  if (isSupabaseConfigured()) {
    const remote = await sb.listStoryViewersInSupabase(storyId);
    if (remote) {
      return {
        ok: true,
        viewers: remote.map((v) => ({
          accountId: v.accountId,
          displayName: v.displayName,
          viewedAt: v.viewedAt,
          reaction: (v.reaction as StoryReactionEmoji | null) ?? null,
        })),
      };
    }
  }

  const views = readStoryViews()
    .filter((v) => v.storyId === storyId)
    .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));
  const reactions = readReactions().filter((r) => r.storyId === storyId);
  const viewers: StoryViewerRow[] = [];
  for (const view of views) {
    const meta = await resolveOwnerMeta("user", view.viewerId);
    viewers.push({
      accountId: view.viewerId,
      displayName: meta.displayName,
      avatarUrl: meta.avatarUrl,
      viewedAt: view.viewedAt,
      reaction: reactions.find((r) => r.accountId === view.viewerId)?.emoji ?? null,
    });
  }
  return { ok: true, viewers };
}

async function resolveStoryOwnerAccountId(
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<string | null> {
  if (ownerType === "user") return ownerId;
  if (isSupabaseConfigured()) {
    const id = await sb.resolveCompanyOwnerAccountId(ownerId);
    if (id) return id;
  }
  // Reverse lookup via getCompanyByAccountId is not available; owner replies for
  // company stories require the companies.owner_account_id column in Supabase.
  return null;
}

export async function replyToStory(
  storyId: string,
  actorId: string,
  text: string
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const story = await getStoryForActor(storyId);
  if (!story || !isStoryActive(story)) return { ok: false, error: "Story not found" };
  if (!(await canViewOwnedContent(actorId, story.ownerType, story.ownerId, story.visibility))) {
    return { ok: false, error: "Forbidden" };
  }
  if (!(await canInteractWithOwnedContent(actorId, story.ownerType, story.ownerId))) {
    return { ok: false, error: "Only followers can reply to stories" };
  }
  if (!text.trim()) return { ok: false, error: "Reply text is required" };

  const targetAccountId = await resolveStoryOwnerAccountId(story.ownerType, story.ownerId);
  if (!targetAccountId) return { ok: false, error: "Could not resolve story owner" };
  if (targetAccountId === actorId) {
    return { ok: false, error: "Cannot reply to your own story" };
  }

  const conv = await getOrCreateConversation(actorId, targetAccountId);
  if (!conv) {
    return { ok: false, error: "Messaging is not available with this account" };
  }

  const content = encodeStoryReply({
    storyId: story.id,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    text: text.trim(),
  });
  const file: MessageAttachment = {
    url: story.mediaUrl,
    name: story.mediaType === "video" ? "story.mp4" : "story.jpg",
    size: 0,
    mimeType: story.mimeType,
    mediaType: story.mediaType === "video" ? "video" : "image",
    durationSeconds: story.durationSeconds,
  };
  const msg = await sendMessage(actorId, conv.id, content, file);
  if (!msg) return { ok: false, error: "Failed to send reply" };
  return { ok: true, conversationId: conv.id };
}
