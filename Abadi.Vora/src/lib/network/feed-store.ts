import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import {
  getProfileByAccountId,
  getProfileBySlug,
  getAccountIdByProfileSlug,
  listLinkedAccounts,
} from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import type {
  FeedComment,
  FeedPost,
  FeedPostAuthor,
  CreatePostInput,
  PostMediaItem,
  ReactionType,
} from "@/types/network";

export type { CreatePostInput };

const DATA_FILE = "feed-data.json";

interface UserEngagement {
  reactions: Record<string, ReactionType>;
  saved: string[];
}

interface FeedDataFile {
  posts: FeedPost[];
  comments: Record<string, FeedComment[]>;
  reactions: Record<string, Record<ReactionType, number>>;
  engagement: Record<string, UserEngagement>;
}

function emptyReactions(): Record<ReactionType, number> {
  return { like: 0, insightful: 0, support: 0, celebrate: 0 };
}

function readData(): FeedDataFile {
  const raw = readJsonStore(DATA_FILE, () => ({
    posts: [] as FeedPost[],
    comments: {} as Record<string, FeedComment[]>,
    reactions: {} as Record<string, Record<ReactionType, number>>,
    engagement: {} as Record<string, UserEngagement>,
  })) as FeedDataFile & { userPosts?: FeedPost[] };
  if (!raw.posts && raw.userPosts) raw.posts = raw.userPosts;
  if (!raw.posts) raw.posts = [];
  if (!raw.comments) raw.comments = {};
  if (!raw.reactions) raw.reactions = {};
  if (!raw.engagement) raw.engagement = {};
  return raw;
}

function writeData(data: FeedDataFile) {
  writeJsonStore(DATA_FILE, data);
}

function getEngagement(data: FeedDataFile, accountId: string): UserEngagement {
  if (!data.engagement[accountId]) {
    data.engagement[accountId] = { reactions: {}, saved: [] };
  }
  return data.engagement[accountId];
}

function authorFromAccount(accountId: string): FeedPostAuthor | null {
  const profile = getProfileByAccountId(accountId);
  if (!profile) return null;
  return authorFromProfile(profile.id, profile.slug, profile);
}

function authorFromProfile(
  id: string,
  slug: string,
  profile: {
    fullName: string;
    headline: string;
    profilePhotoUrl?: string;
    gender?: import("@/types/profile").UserGender;
  }
): FeedPostAuthor {
  const accountId = getAccountIdByProfileSlug(slug);
  const badge = accountId ? getEffectiveSubscription(accountId, "user").badge : null;

  return {
    id,
    slug,
    fullName: profile.fullName,
    headline: profile.headline,
    profilePhotoUrl: resolveAvatarUrl({
      photoUrl: profile.profilePhotoUrl,
      gender: profile.gender,
    }),
    subscriptionBadge: badge,
  };
}

function hydratePostAuthor(post: FeedPost): FeedPost {
  const profile =
    getProfileByAccountId(post.author.id) ?? getProfileBySlug(post.author.slug);
  if (!profile) return post;
  return {
    ...post,
    author: authorFromProfile(profile.id, profile.slug, profile),
  };
}

function normalizeMedia(post: FeedPost): FeedPost {
  if (post.media?.length) return post;
  if (!post.mediaUrls?.length) return post;
  return {
    ...post,
    media: post.mediaUrls.map((url) => ({
      url,
      width: 0,
      height: 0,
    })),
  };
}

function hydrateComment(comment: FeedComment): FeedComment {
  const profile =
    getProfileByAccountId(comment.author.id) ?? getProfileBySlug(comment.author.slug);
  if (!profile) return comment;
  return {
    ...comment,
    author: authorFromProfile(profile.id, profile.slug, profile),
  };
}

function mergePost(post: FeedPost, data: FeedDataFile, accountId?: string): FeedPost {
  const merged = hydratePostAuthor(normalizeMedia(post));

  const storedReactions = data.reactions[merged.id];
  const reactions = storedReactions
    ? { ...emptyReactions(), ...merged.reactions, ...storedReactions }
    : { ...merged.reactions };

  const persistedComments = (data.comments[merged.id] ?? []).map(hydrateComment);
  const embeddedComments = (merged.comments ?? []).map(hydrateComment);
  const comments = [...embeddedComments, ...persistedComments];

  let userReaction: ReactionType | undefined;
  let isSaved = merged.isSaved;

  if (accountId) {
    const engagement = data.engagement[accountId];
    if (engagement) {
      userReaction = engagement.reactions[merged.id];
      isSaved = engagement.saved.includes(merged.id);
    }
  }

  return {
    ...merged,
    reactions,
    comments,
    commentCount: Math.max(merged.commentCount, comments.length),
    userReaction,
    isSaved,
  };
}

function findPost(data: FeedDataFile, postId: string): FeedPost | undefined {
  return data.posts.find((p) => p.id === postId);
}

export function getFeedPosts(accountId?: string): FeedPost[] {
  const data = readData();
  return [...data.posts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => mergePost(post, data, accountId));
}

export function createFeedPost(accountId: string, input: CreatePostInput): FeedPost | null {
  const author = authorFromAccount(accountId);
  if (!author) return null;

  const media: PostMediaItem[] | undefined =
    input.media ??
    input.mediaUrls?.map((url) => ({ url, width: 0, height: 0 }));

  const data = readData();
  const post: FeedPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: input.type,
    author,
    content: input.content,
    mediaUrls: media?.map((m) => m.url) ?? input.mediaUrls,
    media,
    articleTitle: input.articleTitle,
    articleCoverUrl: input.articleCoverUrl,
    pollQuestion: input.pollQuestion,
    pollOptions: input.pollOptions,
    pollExpiresAt: input.pollExpiresAt,
    reactions: emptyReactions(),
    commentCount: 0,
    shareCount: 0,
    isSaved: false,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  data.posts.unshift(post);
  writeData(data);
  return mergePost(post, data, accountId);
}

export function togglePostReaction(
  accountId: string,
  postId: string,
  type: ReactionType | null
): { reactions: Record<ReactionType, number>; userReaction?: ReactionType } | null {
  const data = readData();
  if (!findPost(data, postId)) return null;

  const engagement = getEngagement(data, accountId);
  const previous = engagement.reactions[postId];

  if (!data.reactions[postId]) {
    const base = findPost(data, postId);
    data.reactions[postId] = base ? { ...base.reactions } : emptyReactions();
  }

  const counts = { ...data.reactions[postId] };

  if (previous === type || (type === null && previous)) {
    if (previous) counts[previous] = Math.max(0, counts[previous] - 1);
    delete engagement.reactions[postId];
    data.reactions[postId] = counts;
    writeData(data);
    return { reactions: counts, userReaction: undefined };
  }

  if (previous) counts[previous] = Math.max(0, counts[previous] - 1);
  if (type) {
    counts[type] = counts[type] + 1;
    engagement.reactions[postId] = type;
  }

  data.reactions[postId] = counts;
  writeData(data);
  return { reactions: counts, userReaction: type ?? undefined };
}

export function addPostComment(
  accountId: string,
  postId: string,
  content: string
): FeedComment | null {
  const author = authorFromAccount(accountId);
  if (!author) return null;

  const data = readData();
  const post = findPost(data, postId);
  if (!post) return null;

  const comment: FeedComment = {
    id: `comment-${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };

  if (!data.comments[postId]) data.comments[postId] = [];
  data.comments[postId].push(comment);
  post.commentCount = Math.max(post.commentCount, data.comments[postId].length);
  writeData(data);
  return comment;
}

export function togglePostSave(accountId: string, postId: string): boolean {
  const data = readData();
  if (!findPost(data, postId)) return false;

  const engagement = getEngagement(data, accountId);
  const index = engagement.saved.indexOf(postId);

  if (index >= 0) {
    engagement.saved.splice(index, 1);
    writeData(data);
    return false;
  }

  engagement.saved.push(postId);
  writeData(data);
  return true;
}

export function incrementShareCount(postId: string): number {
  const data = readData();
  const post = findPost(data, postId);
  if (post) {
    post.shareCount += 1;
    writeData(data);
    return post.shareCount;
  }
  return 0;
}

/** Resolve live author data for all linked accounts (for messaging / discovery). */
export function getLinkedAccountIds(): string[] {
  return listLinkedAccounts();
}
