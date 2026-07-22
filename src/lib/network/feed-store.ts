import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  getProfileByAccountId,
  getProfileBySlug,
  getAccountIdByProfileSlug,
  listLinkedAccounts,
} from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import {
  addPostCommentInSupabase,
  createFeedPostInSupabase,
  deleteFeedPostFromSupabase,
  listFeedPostsFromSupabase,
  migrateJsonFeedToSupabase,
  recordPostShareInSupabase,
  togglePostReactionInSupabase,
  togglePostSaveInSupabase,
  updateFeedPostInSupabase,
  votePollInSupabase,
  getFeedPostFromSupabase,
  countFeedPostsInSupabase,
} from "@/lib/network/feed-supabase";
import type {
  FeedComment,
  FeedPost,
  FeedPostAuthor,
  CreatePostInput,
  PostMediaItem,
  ReactionType,
  PollOption,
} from "@/types/network";

export type { CreatePostInput };

const DATA_FILE = "feed-data.json";
const MIGRATION_FLAG = "feed-supabase-migrated.json";

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

let feedTableProbed = false;
let feedTableAvailable = false;

async function isFeedSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (feedTableProbed) return feedTableAvailable;

  feedTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("network_posts").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("network_posts missing", error);
      }
      feedTableAvailable = false;
      return false;
    }
    feedTableAvailable = true;
    return true;
  } catch {
    feedTableAvailable = false;
    return false;
  }
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
    getProfileByAccountId(post.authorAccountId ?? post.author.id) ??
    getProfileBySlug(post.author.slug);
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

async function maybeMigrateJsonToSupabase(): Promise<void> {
  if (!(await isFeedSupabaseReady())) return;

  const flag = readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean }));
  if (flag.done) return;

  const data = readData();
  await runOptionalDbSync("feed-json-migration", async () => {
    const migrated = await migrateJsonFeedToSupabase({
      posts: data.posts,
      comments: data.comments,
      reactions: data.reactions,
      engagement: data.engagement,
    });

    const count = await countFeedPostsInSupabase();
    writeJsonStore(MIGRATION_FLAG, {
      done: true,
      migratedAt: new Date().toISOString(),
      migratedPosts: migrated,
      supabaseCount: count,
    });
    return migrated;
  }, 0);

  if (!readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean })).done) {
    writeJsonStore(MIGRATION_FLAG, { done: true, skipped: true });
  }
}

function getFeedPostsJson(accountId?: string): FeedPost[] {
  const data = readData();
  return [...data.posts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => mergePost(post, data, accountId));
}

export async function getFeedPosts(
  accountId?: string,
  options?: { limit?: number; offset?: number }
): Promise<FeedPost[]> {
  if (await isFeedSupabaseReady()) {
    await maybeMigrateJsonToSupabase();
    return runOptionalDbSync(
      "getFeedPosts",
      () => listFeedPostsFromSupabase(accountId, options),
      getFeedPostsJson(accountId)
    );
  }
  return getFeedPostsJson(accountId);
}

export async function getFeedPostById(
  postId: string,
  accountId?: string
): Promise<FeedPost | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "getFeedPostById",
      () => getFeedPostFromSupabase(postId, accountId),
      getFeedPostsJson(accountId).find((post) => post.id === postId) ?? null
    );
  }
  return getFeedPostsJson(accountId).find((post) => post.id === postId) ?? null;
}

export async function createFeedPost(
  accountId: string,
  input: CreatePostInput
): Promise<FeedPost | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "createFeedPost",
      () => createFeedPostInSupabase(accountId, input),
      createFeedPostJson(accountId, input)
    );
  }
  return createFeedPostJson(accountId, input);
}

function createFeedPostJson(accountId: string, input: CreatePostInput): FeedPost | null {
  const author = authorFromAccount(accountId);
  if (!author) return null;

  const media: PostMediaItem[] | undefined =
    input.media ?? input.mediaUrls?.map((url) => ({ url, width: 0, height: 0 }));

  const data = readData();
  const post: FeedPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: input.type,
    author,
    authorAccountId: accountId,
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

export async function updateFeedPost(
  accountId: string,
  postId: string,
  input: Partial<CreatePostInput>
): Promise<FeedPost | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "updateFeedPost",
      () => updateFeedPostInSupabase(accountId, postId, input),
      updateFeedPostJson(accountId, postId, input)
    );
  }
  return updateFeedPostJson(accountId, postId, input);
}

function updateFeedPostJson(
  accountId: string,
  postId: string,
  input: Partial<CreatePostInput>
): FeedPost | null {
  const data = readData();
  const post = findPost(data, postId);
  if (!post) return null;

  const ownerAccountId = post.authorAccountId ?? getAccountIdByProfileSlug(post.author.slug);
  if (ownerAccountId !== accountId) return null;

  if (input.content !== undefined) post.content = input.content;
  if (input.type !== undefined) post.type = input.type;
  if (input.articleTitle !== undefined) post.articleTitle = input.articleTitle;
  if (input.articleCoverUrl !== undefined) post.articleCoverUrl = input.articleCoverUrl;
  if (input.pollQuestion !== undefined) post.pollQuestion = input.pollQuestion;
  if (input.pollOptions !== undefined) post.pollOptions = input.pollOptions;
  if (input.pollExpiresAt !== undefined) post.pollExpiresAt = input.pollExpiresAt;
  if (input.media !== undefined || input.mediaUrls !== undefined) {
    const media = input.media ?? input.mediaUrls?.map((url) => ({ url, width: 0, height: 0 }));
    post.media = media;
    post.mediaUrls = media?.map((item) => item.url);
  }

  post.updatedAt = new Date().toISOString();
  writeData(data);
  return mergePost(post, data, accountId);
}

export async function deleteFeedPost(accountId: string, postId: string): Promise<boolean> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "deleteFeedPost",
      () => deleteFeedPostFromSupabase(accountId, postId),
      deleteFeedPostJson(accountId, postId)
    );
  }
  return deleteFeedPostJson(accountId, postId);
}

function deleteFeedPostJson(accountId: string, postId: string): boolean {
  const data = readData();
  const index = data.posts.findIndex((post) => post.id === postId);
  if (index < 0) return false;

  const post = data.posts[index];
  const ownerAccountId = post.authorAccountId ?? getAccountIdByProfileSlug(post.author.slug);
  if (ownerAccountId !== accountId) return false;

  data.posts.splice(index, 1);
  delete data.comments[postId];
  delete data.reactions[postId];
  for (const engagement of Object.values(data.engagement)) {
    delete engagement.reactions[postId];
    engagement.saved = engagement.saved.filter((id) => id !== postId);
  }
  writeData(data);
  return true;
}

export async function togglePostReaction(
  accountId: string,
  postId: string,
  type: ReactionType | null
): Promise<{ reactions: Record<ReactionType, number>; userReaction?: ReactionType } | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "togglePostReaction",
      () => togglePostReactionInSupabase(accountId, postId, type),
      togglePostReactionJson(accountId, postId, type)
    );
  }
  return togglePostReactionJson(accountId, postId, type);
}

function togglePostReactionJson(
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

export async function addPostComment(
  accountId: string,
  postId: string,
  content: string
): Promise<FeedComment | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "addPostComment",
      () => addPostCommentInSupabase(accountId, postId, content),
      addPostCommentJson(accountId, postId, content)
    );
  }
  return addPostCommentJson(accountId, postId, content);
}

function addPostCommentJson(
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

export async function togglePostSave(accountId: string, postId: string): Promise<boolean> {
  if (await isFeedSupabaseReady()) {
    const result = await runOptionalDbSync(
      "togglePostSave",
      () => togglePostSaveInSupabase(accountId, postId),
      togglePostSaveJson(accountId, postId)
    );
    return result ?? false;
  }
  return togglePostSaveJson(accountId, postId);
}

function togglePostSaveJson(accountId: string, postId: string): boolean {
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

export async function incrementShareCount(
  accountId: string,
  postId: string,
  quoteText?: string
): Promise<number> {
  if (await isFeedSupabaseReady()) {
    const result = await runOptionalDbSync(
      "incrementShareCount",
      () => recordPostShareInSupabase(accountId, postId, quoteText),
      incrementShareCountJson(postId)
    );
    return result ?? 0;
  }
  return incrementShareCountJson(postId);
}

function incrementShareCountJson(postId: string): number {
  const data = readData();
  const post = findPost(data, postId);
  if (post) {
    post.shareCount += 1;
    writeData(data);
    return post.shareCount;
  }
  return 0;
}

export async function votePoll(
  accountId: string,
  postId: string,
  optionIndex: number
): Promise<{ pollOptions: PollOption[]; userPollVoteIndex: number } | null> {
  if (await isFeedSupabaseReady()) {
    return runOptionalDbSync(
      "votePoll",
      () => votePollInSupabase(accountId, postId, optionIndex),
      votePollJson(accountId, postId, optionIndex)
    );
  }
  return votePollJson(accountId, postId, optionIndex);
}

function votePollJson(
  accountId: string,
  postId: string,
  optionIndex: number
): { pollOptions: PollOption[]; userPollVoteIndex: number } | null {
  const data = readData();
  const post = findPost(data, postId);
  if (!post?.pollOptions || optionIndex < 0 || optionIndex >= post.pollOptions.length) {
    return null;
  }

  if (post.userPollVoteIndex !== undefined) return null;

  post.pollOptions = post.pollOptions.map((option, index) =>
    index === optionIndex ? { ...option, votes: option.votes + 1 } : option
  );
  post.userPollVoteIndex = optionIndex;
  writeData(data);

  return { pollOptions: post.pollOptions, userPollVoteIndex: optionIndex };
}

export function isFeedPersistenceActive(): boolean {
  return isAdminClientAvailable() && feedTableAvailable;
}

/** Resolve live author data for all linked accounts (for messaging / discovery). */
export function getLinkedAccountIds(): string[] {
  return listLinkedAccounts();
}
