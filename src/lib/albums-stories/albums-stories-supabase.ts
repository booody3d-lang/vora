import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase/safe-db";
import type {
  Album,
  AlbumPhoto,
  AlbumPhotoComment,
  ContentOwnerType,
  ContentVisibility,
  CreateAlbumInput,
  CreateStoryInput,
  StoryItem,
} from "@/types/albums-stories";

let tablesMissing = false;

function markMissing(error: unknown) {
  if (isMissingRelationError(error as { code?: string; message?: string })) {
    tablesMissing = true;
  }
}

export function albumsStoriesTablesMissing(): boolean {
  return tablesMissing;
}

function mapAlbum(row: Record<string, unknown>, photoCount = 0): Album {
  return {
    id: String(row.id),
    ownerType: row.owner_type as ContentOwnerType,
    ownerId: String(row.owner_id),
    title: String(row.title),
    visibility: row.visibility as ContentVisibility,
    coverPhotoUrl: (row.cover_photo_url as string | null) ?? undefined,
    photoCount,
    feedPostId: (row.feed_post_id as string | null) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPhoto(
  row: Record<string, unknown>,
  likeCount = 0,
  commentCount = 0,
  likedByMe = false
): AlbumPhoto {
  return {
    id: String(row.id),
    albumId: String(row.album_id),
    url: String(row.url),
    caption: (row.caption as string | null) ?? undefined,
    mimeType: (row.mime_type as string | null) ?? undefined,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: String(row.created_at),
    likeCount,
    commentCount,
    likedByMe,
  };
}

function mapStory(row: Record<string, unknown>, viewedByMe = false): StoryItem {
  return {
    id: String(row.id),
    ownerType: row.owner_type as ContentOwnerType,
    ownerId: String(row.owner_id),
    mediaUrl: String(row.media_url),
    mediaType: row.media_type as StoryItem["mediaType"],
    mimeType: (row.mime_type as string | null) ?? undefined,
    durationSeconds:
      row.duration_seconds != null ? Number(row.duration_seconds) : undefined,
    visibility: row.visibility as ContentVisibility,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    viewedByMe,
  };
}

export async function listAlbumsInSupabase(
  ownerType: ContentOwnerType,
  ownerId: string
): Promise<Album[] | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("albums")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    markMissing(error);
    return null;
  }

  const albums = data ?? [];
  const withCounts: Album[] = [];
  for (const row of albums) {
    const { count } = await admin
      .from("album_photos")
      .select("id", { count: "exact", head: true })
      .eq("album_id", row.id);
    withCounts.push(mapAlbum(row, count ?? 0));
  }
  return withCounts;
}

export async function getAlbumInSupabase(albumId: string): Promise<Album | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("albums").select("*").eq("id", albumId).maybeSingle();
  if (error) {
    markMissing(error);
    return null;
  }
  if (!data) return null;
  const { count } = await admin
    .from("album_photos")
    .select("id", { count: "exact", head: true })
    .eq("album_id", albumId);
  return mapAlbum(data, count ?? 0);
}

export async function createAlbumInSupabase(input: CreateAlbumInput): Promise<Album | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("albums")
    .insert({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      title: input.title.trim(),
      visibility: input.visibility,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    markMissing(error);
    return null;
  }
  return mapAlbum(data, 0);
}

export async function updateAlbumInSupabase(
  albumId: string,
  patch: Partial<{
    title: string;
    visibility: ContentVisibility;
    coverPhotoUrl: string | null;
    feedPostId: string | null;
  }>
): Promise<Album | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title != null) update.title = patch.title.trim();
  if (patch.visibility != null) update.visibility = patch.visibility;
  if (patch.coverPhotoUrl !== undefined) update.cover_photo_url = patch.coverPhotoUrl;
  if (patch.feedPostId !== undefined) update.feed_post_id = patch.feedPostId;
  const { data, error } = await admin
    .from("albums")
    .update(update)
    .eq("id", albumId)
    .select("*")
    .single();
  if (error) {
    markMissing(error);
    return null;
  }
  return getAlbumInSupabase(data.id);
}

export async function deleteAlbumInSupabase(albumId: string): Promise<boolean> {
  if (tablesMissing) return false;
  const admin = createAdminClient();
  const { error } = await admin.from("albums").delete().eq("id", albumId);
  if (error) {
    markMissing(error);
    return false;
  }
  return true;
}

export async function listAlbumPhotosInSupabase(
  albumId: string,
  viewerId?: string | null
): Promise<AlbumPhoto[] | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("album_photos")
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    markMissing(error);
    return null;
  }

  const photos: AlbumPhoto[] = [];
  for (const row of data ?? []) {
    const [{ count: likeCount }, { count: commentCount }, liked] = await Promise.all([
      admin
        .from("album_photo_likes")
        .select("id", { count: "exact", head: true })
        .eq("photo_id", row.id),
      admin
        .from("album_photo_comments")
        .select("id", { count: "exact", head: true })
        .eq("photo_id", row.id),
      viewerId
        ? admin
            .from("album_photo_likes")
            .select("id")
            .eq("photo_id", row.id)
            .eq("account_id", viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    photos.push(
      mapPhoto(row, likeCount ?? 0, commentCount ?? 0, Boolean(liked.data))
    );
  }
  return photos;
}

export async function addAlbumPhotoInSupabase(input: {
  albumId: string;
  url: string;
  caption?: string;
  mimeType?: string;
}): Promise<AlbumPhoto | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { count } = await admin
    .from("album_photos")
    .select("id", { count: "exact", head: true })
    .eq("album_id", input.albumId);

  const { data, error } = await admin
    .from("album_photos")
    .insert({
      album_id: input.albumId,
      url: input.url,
      caption: input.caption ?? null,
      mime_type: input.mimeType ?? null,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (error) {
    markMissing(error);
    return null;
  }

  if ((count ?? 0) === 0) {
    await admin
      .from("albums")
      .update({ cover_photo_url: input.url, updated_at: new Date().toISOString() })
      .eq("id", input.albumId);
  } else {
    await admin
      .from("albums")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.albumId);
  }

  return mapPhoto(data, 0, 0, false);
}

export async function getAlbumPhotoInSupabase(photoId: string): Promise<AlbumPhoto | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("album_photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();
  if (error) {
    markMissing(error);
    return null;
  }
  if (!data) return null;
  return mapPhoto(data);
}

export async function deleteAlbumPhotoInSupabase(photoId: string): Promise<boolean> {
  if (tablesMissing) return false;
  const admin = createAdminClient();
  const { error } = await admin.from("album_photos").delete().eq("id", photoId);
  if (error) {
    markMissing(error);
    return false;
  }
  return true;
}

export async function toggleAlbumPhotoLikeInSupabase(
  photoId: string,
  accountId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("album_photo_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing) {
    await admin.from("album_photo_likes").delete().eq("id", existing.id);
  } else {
    const { error } = await admin.from("album_photo_likes").insert({
      photo_id: photoId,
      account_id: accountId,
    });
    if (error) {
      markMissing(error);
      return null;
    }
  }

  const { count } = await admin
    .from("album_photo_likes")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", photoId);

  return { liked: !existing, likeCount: count ?? 0 };
}

export async function listAlbumPhotoCommentsInSupabase(
  photoId: string,
  viewerId?: string | null
): Promise<AlbumPhotoComment[] | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("album_photo_comments")
    .select("*")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });
  if (error) {
    markMissing(error);
    return null;
  }

  const flat: AlbumPhotoComment[] = [];
  for (const row of data ?? []) {
    const [{ data: profile }, { data: reactions }, myReaction] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", row.account_id).maybeSingle(),
      admin
        .from("album_photo_comment_reactions")
        .select("emoji")
        .eq("comment_id", row.id),
      viewerId
        ? admin
            .from("album_photo_comment_reactions")
            .select("emoji")
            .eq("comment_id", row.id)
            .eq("account_id", viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const reactionCounts: NonNullable<AlbumPhotoComment["reactions"]> = {};
    for (const r of reactions ?? []) {
      const key = r.emoji as keyof NonNullable<AlbumPhotoComment["reactions"]>;
      reactionCounts[key] = (reactionCounts[key] ?? 0) + 1;
    }

    flat.push({
      id: String(row.id),
      photoId: String(row.photo_id),
      accountId: String(row.account_id),
      authorName: (profile?.full_name as string) || "User",
      content: String(row.content),
      createdAt: String(row.created_at),
      parentId: (row.parent_id as string | null) ?? null,
      likeCount: Object.values(reactionCounts).reduce((a, b) => a + (b ?? 0), 0),
      likedByMe: Boolean(myReaction.data),
      myReaction: (myReaction.data?.emoji as AlbumPhotoComment["myReaction"]) ?? null,
      reactions: reactionCounts,
      replies: [],
    });
  }

  const roots = flat.filter((c) => !c.parentId);
  for (const root of roots) {
    root.replies = flat.filter((c) => c.parentId === root.id);
  }
  return roots;
}

export async function addAlbumPhotoCommentInSupabase(input: {
  photoId: string;
  accountId: string;
  content: string;
  parentId?: string | null;
}): Promise<AlbumPhotoComment | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const insert: Record<string, unknown> = {
    photo_id: input.photoId,
    account_id: input.accountId,
    content: input.content.trim(),
  };
  if (input.parentId) insert.parent_id = input.parentId;

  const { data, error } = await admin
    .from("album_photo_comments")
    .insert(insert)
    .select("*")
    .single();
  if (error) {
    // Retry without parent_id if column missing
    if (String(error.message || "").toLowerCase().includes("parent_id")) {
      const { data: fallback, error: err2 } = await admin
        .from("album_photo_comments")
        .insert({
          photo_id: input.photoId,
          account_id: input.accountId,
          content: input.content.trim(),
        })
        .select("*")
        .single();
      if (err2) {
        markMissing(err2);
        return null;
      }
      const list = await listAlbumPhotoCommentsInSupabase(input.photoId, input.accountId);
      return (
        list?.find((c) => c.id === fallback.id) ??
        list?.flatMap((c) => c.replies ?? []).find((c) => c.id === fallback.id) ??
        null
      );
    }
    markMissing(error);
    return null;
  }
  const list = await listAlbumPhotoCommentsInSupabase(input.photoId, input.accountId);
  return (
    list?.find((c) => c.id === data.id) ??
    list?.flatMap((c) => c.replies ?? []).find((c) => c.id === data.id) ??
    null
  );
}

export async function setAlbumPhotoCommentReactionInSupabase(
  commentId: string,
  accountId: string,
  emoji: string | null
): Promise<{
  reactions: NonNullable<AlbumPhotoComment["reactions"]>;
  myReaction: AlbumPhotoComment["myReaction"];
  likeCount: number;
} | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  await admin
    .from("album_photo_comment_reactions")
    .delete()
    .eq("comment_id", commentId)
    .eq("account_id", accountId);

  if (emoji) {
    const { error } = await admin.from("album_photo_comment_reactions").insert({
      comment_id: commentId,
      account_id: accountId,
      emoji,
    });
    if (error) {
      markMissing(error);
      return null;
    }
  }

  const { data: reactions } = await admin
    .from("album_photo_comment_reactions")
    .select("emoji")
    .eq("comment_id", commentId);
  const reactionCounts: NonNullable<AlbumPhotoComment["reactions"]> = {};
  for (const row of reactions ?? []) {
    const key = row.emoji as keyof NonNullable<AlbumPhotoComment["reactions"]>;
    reactionCounts[key] = (reactionCounts[key] ?? 0) + 1;
  }
  const likeCount = Object.values(reactionCounts).reduce((a, b) => a + (b ?? 0), 0);
  return {
    reactions: reactionCounts,
    myReaction: (emoji as AlbumPhotoComment["myReaction"]) ?? null,
    likeCount,
  };
}

export async function getAlbumPhotoIdForCommentInSupabase(
  commentId: string
): Promise<string | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("album_photo_comments")
    .select("photo_id")
    .eq("id", commentId)
    .maybeSingle();
  if (error) {
    markMissing(error);
    return null;
  }
  return (data?.photo_id as string | undefined) ?? null;
}

export async function createStoryInSupabase(input: CreateStoryInput): Promise<StoryItem | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await admin
    .from("stories")
    .insert({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      mime_type: input.mimeType ?? null,
      duration_seconds: input.durationSeconds ?? null,
      visibility: input.visibility,
      expires_at: expiresAt.toISOString(),
      created_at: createdAt.toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    markMissing(error);
    return null;
  }
  return mapStory(data, false);
}

export async function listActiveStoriesForOwnerInSupabase(
  ownerType: ContentOwnerType,
  ownerId: string,
  viewerId?: string | null
): Promise<StoryItem[] | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("stories")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  if (error) {
    markMissing(error);
    return null;
  }

  const stories: StoryItem[] = [];
  for (const row of data ?? []) {
    let viewedByMe = false;
    if (viewerId) {
      const { data: view } = await admin
        .from("story_views")
        .select("id")
        .eq("story_id", row.id)
        .eq("viewer_id", viewerId)
        .maybeSingle();
      viewedByMe = Boolean(view);
    }
    stories.push(mapStory(row, viewedByMe));
  }
  return stories;
}

export async function listActiveStoriesFeedInSupabase(
  viewerId?: string | null
): Promise<StoryItem[] | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("stories")
    .select("*")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    markMissing(error);
    return null;
  }

  const stories: StoryItem[] = [];
  for (const row of data ?? []) {
    let viewedByMe = false;
    if (viewerId) {
      const { data: view } = await admin
        .from("story_views")
        .select("id")
        .eq("story_id", row.id)
        .eq("viewer_id", viewerId)
        .maybeSingle();
      viewedByMe = Boolean(view);
    }
    stories.push(mapStory(row, viewedByMe));
  }
  return stories;
}

export async function getStoryInSupabase(storyId: string): Promise<StoryItem | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("stories").select("*").eq("id", storyId).maybeSingle();
  if (error) {
    markMissing(error);
    return null;
  }
  if (!data) return null;
  return mapStory(data);
}

export async function deleteStoryInSupabase(storyId: string): Promise<boolean> {
  if (tablesMissing) return false;
  const admin = createAdminClient();
  const { error } = await admin.from("stories").delete().eq("id", storyId);
  if (error) {
    markMissing(error);
    return false;
  }
  return true;
}

export async function recordStoryViewInSupabase(
  storyId: string,
  viewerId: string
): Promise<boolean> {
  if (tablesMissing) return false;
  const admin = createAdminClient();
  const { error } = await admin.from("story_views").upsert(
    {
      story_id: storyId,
      viewer_id: viewerId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "story_id,viewer_id" }
  );
  if (error) {
    markMissing(error);
    return false;
  }
  return true;
}

export async function purgeExpiredStoriesInSupabase(): Promise<number> {
  if (tablesMissing) return 0;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("stories")
    .delete()
    .lt("expires_at", now)
    .select("id");
  if (error) {
    markMissing(error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function enrichStoryEngagementInSupabase(
  story: StoryItem,
  viewerId?: string | null
): Promise<StoryItem> {
  if (tablesMissing) return story;
  const admin = createAdminClient();

  const [{ count: viewCount }, { data: reactions }, myReaction] = await Promise.all([
    admin
      .from("story_views")
      .select("id", { count: "exact", head: true })
      .eq("story_id", story.id),
    admin.from("story_reactions").select("emoji").eq("story_id", story.id),
    viewerId
      ? admin
          .from("story_reactions")
          .select("emoji")
          .eq("story_id", story.id)
          .eq("account_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const reactionCounts: NonNullable<StoryItem["reactions"]> = {};
  for (const row of reactions ?? []) {
    const key = row.emoji as keyof NonNullable<StoryItem["reactions"]>;
    reactionCounts[key] = (reactionCounts[key] ?? 0) + 1;
  }

  return {
    ...story,
    viewCount: viewCount ?? 0,
    reactions: reactionCounts,
    myReaction: (myReaction.data?.emoji as StoryItem["myReaction"]) ?? null,
  };
}

export async function setStoryReactionInSupabase(
  storyId: string,
  accountId: string,
  emoji: string | null
): Promise<{
  reactions: NonNullable<StoryItem["reactions"]>;
  myReaction: StoryItem["myReaction"];
} | null> {
  if (tablesMissing) return null;
  const admin = createAdminClient();

  await admin
    .from("story_reactions")
    .delete()
    .eq("story_id", storyId)
    .eq("account_id", accountId);

  if (emoji) {
    const { error } = await admin.from("story_reactions").insert({
      story_id: storyId,
      account_id: accountId,
      emoji,
    });
    if (error) {
      markMissing(error);
      return null;
    }
  }

  const { data: reactions } = await admin
    .from("story_reactions")
    .select("emoji")
    .eq("story_id", storyId);
  const reactionCounts: NonNullable<StoryItem["reactions"]> = {};
  for (const row of reactions ?? []) {
    const key = row.emoji as keyof NonNullable<StoryItem["reactions"]>;
    reactionCounts[key] = (reactionCounts[key] ?? 0) + 1;
  }
  return {
    reactions: reactionCounts,
    myReaction: (emoji as StoryItem["myReaction"]) ?? null,
  };
}

export async function listStoryViewersInSupabase(
  storyId: string
): Promise<
  | {
      accountId: string;
      displayName: string;
      viewedAt: string;
      reaction?: string | null;
    }[]
  | null
> {
  if (tablesMissing) return null;
  const admin = createAdminClient();
  const { data: views, error } = await admin
    .from("story_views")
    .select("viewer_id, viewed_at")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false });
  if (error) {
    markMissing(error);
    return null;
  }

  const { data: reactions } = await admin
    .from("story_reactions")
    .select("account_id, emoji")
    .eq("story_id", storyId);
  const reactionByAccount = new Map(
    (reactions ?? []).map((r) => [String(r.account_id), String(r.emoji)])
  );

  const rows: {
    accountId: string;
    displayName: string;
    viewedAt: string;
    reaction?: string | null;
  }[] = [];

  for (const view of views ?? []) {
    const accountId = String(view.viewer_id);
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", accountId)
      .maybeSingle();
    rows.push({
      accountId,
      displayName: (profile?.full_name as string) || "User",
      viewedAt: String(view.viewed_at),
      reaction: reactionByAccount.get(accountId) ?? null,
    });
  }
  return rows;
}

export async function resolveCompanyOwnerAccountId(
  companyId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("owner_account_id")
    .eq("id", companyId)
    .maybeSingle();
  return (data?.owner_account_id as string | undefined) ?? null;
}
