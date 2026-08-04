export type ContentOwnerType = "user" | "company";
export type ContentVisibility = "public" | "followers_only";
export type StoryMediaType = "image" | "video";
export type StoryReactionEmoji = "like" | "love" | "laugh" | "wow" | "sad" | "fire";

export interface Album {
  id: string;
  ownerType: ContentOwnerType;
  ownerId: string;
  title: string;
  visibility: ContentVisibility;
  coverPhotoUrl?: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumPhoto {
  id: string;
  albumId: string;
  url: string;
  caption?: string;
  mimeType?: string;
  sortOrder: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface AlbumPhotoComment {
  id: string;
  photoId: string;
  accountId: string;
  authorName: string;
  authorPhotoUrl?: string;
  content: string;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  ownerType: ContentOwnerType;
  ownerId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  mimeType?: string;
  durationSeconds?: number;
  visibility: ContentVisibility;
  expiresAt: string;
  createdAt: string;
  viewedByMe?: boolean;
  viewCount?: number;
  reactions?: Partial<Record<StoryReactionEmoji, number>>;
  myReaction?: StoryReactionEmoji | null;
}

export interface StoryViewerRow {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
  viewedAt: string;
  reaction?: StoryReactionEmoji | null;
}

export interface StoryOwnerGroup {
  ownerType: ContentOwnerType;
  ownerId: string;
  displayName: string;
  avatarUrl?: string;
  slug?: string;
  gender?: "male" | "female" | null;
  hasUnseen: boolean;
  stories: StoryItem[];
}

export interface CreateAlbumInput {
  ownerType: ContentOwnerType;
  ownerId: string;
  title: string;
  visibility: ContentVisibility;
}

export interface CreateStoryInput {
  ownerType: ContentOwnerType;
  ownerId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  mimeType?: string;
  durationSeconds?: number;
  visibility: ContentVisibility;
}

export const STORY_REACTION_EMOJI: Record<StoryReactionEmoji, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
};
