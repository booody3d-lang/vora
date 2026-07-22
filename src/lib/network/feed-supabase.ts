import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProfileByAccountId,
  getAccountIdByProfileSlug,
} from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import type {
  CreatePostInput,
  FeedComment,
  FeedPost,
  FeedPostAuthor,
  PollOption,
  PostMediaItem,
  ReactionType,
} from "@/types/network";

const REACTION_TYPES: ReactionType[] = ["like", "insightful", "support", "celebrate"];

interface DbNetworkPost {
  id: string;
  author_id: string;
  post_type: FeedPost["type"];
  content: string | null;
  media_urls: string[] | null;
  article_title: string | null;
  article_cover_url: string | null;
  poll_question: string | null;
  poll_options: PollOption[] | null;
  poll_expires_at: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface DbCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
}

interface DbReactionRow {
  post_id: string;
  account_id: string;
  reaction: ReactionType;
}

export interface FeedListOptions {
  limit?: number;
  offset?: number;
}

function emptyReactions(): Record<ReactionType, number> {
  return { like: 0, insightful: 0, support: 0, celebrate: 0 };
}

function authorFromAccount(accountId: string): FeedPostAuthor | null {
  const profile = getProfileByAccountId(accountId);
  if (!profile) return null;

  const badge = getEffectiveSubscription(accountId, "user").badge;

  return {
    id: profile.id,
    slug: profile.slug,
    fullName: profile.fullName,
    headline: profile.headline,
    profilePhotoUrl: resolveAvatarUrl({
      photoUrl: profile.profilePhotoUrl,
      gender: profile.gender,
    }),
    subscriptionBadge: badge,
  };
}

function normalizePollOptions(raw: unknown): PollOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const row = item as { text?: string; votes?: number };
    return {
      text: row.text ?? "",
      votes: typeof row.votes === "number" ? row.votes : 0,
    };
  });
}

function mediaFromUrls(urls: string[] | null | undefined): PostMediaItem[] | undefined {
  if (!urls?.length) return undefined;
  return urls.map((url) => ({ url, width: 0, height: 0 }));
}

function buildPostEngagementMaps(
  postIds: string[],
  reactionRows: DbReactionRow[] | null,
  commentRows: { post_id: string }[] | null,
  shareRows: { post_id: string }[] | null,
  saveRows: { post_id: string }[] | null,
  pollVoteRows: { post_id: string; option_index: number }[] | null,
  accountId?: string
) {
  const reactionsByPost = new Map<string, Record<ReactionType, number>>();
  const userReactionByPost = new Map<string, ReactionType>();
  const commentCountByPost = new Map<string, number>();
  const shareCountByPost = new Map<string, number>();
  const savedPostIds = new Set<string>();
  const userPollVoteByPost = new Map<string, number>();

  for (const postId of postIds) {
    reactionsByPost.set(postId, emptyReactions());
    commentCountByPost.set(postId, 0);
    shareCountByPost.set(postId, 0);
  }

  for (const row of reactionRows ?? []) {
    const counts = reactionsByPost.get(row.post_id) ?? emptyReactions();
    if (REACTION_TYPES.includes(row.reaction)) {
      counts[row.reaction] += 1;
    }
    reactionsByPost.set(row.post_id, counts);
    if (accountId && row.account_id === accountId) {
      userReactionByPost.set(row.post_id, row.reaction);
    }
  }

  for (const row of commentRows ?? []) {
    commentCountByPost.set(row.post_id, (commentCountByPost.get(row.post_id) ?? 0) + 1);
  }

  for (const row of shareRows ?? []) {
    shareCountByPost.set(row.post_id, (shareCountByPost.get(row.post_id) ?? 0) + 1);
  }

  for (const row of saveRows ?? []) {
    savedPostIds.add(row.post_id);
  }

  for (const row of pollVoteRows ?? []) {
    if (accountId) {
      userPollVoteByPost.set(row.post_id, row.option_index);
    }
  }

  return {
    reactionsByPost,
    userReactionByPost,
    commentCountByPost,
    shareCountByPost,
    savedPostIds,
    userPollVoteByPost,
  };
}

function mapDbPostToFeedPost(
  row: DbNetworkPost,
  extras: {
    reactions: Record<ReactionType, number>;
    userReaction?: ReactionType;
    commentCount: number;
    shareCount: number;
    isSaved: boolean;
    comments?: FeedComment[];
    userPollVoteIndex?: number;
  }
): FeedPost | null {
  const author = authorFromAccount(row.author_id);
  if (!author) return null;

  const mediaUrls = row.media_urls ?? undefined;
  const pollOptions = normalizePollOptions(row.poll_options);

  return {
    id: row.id,
    type: row.post_type,
    author,
    authorAccountId: row.author_id,
    content: row.content ?? undefined,
    mediaUrls,
    media: mediaFromUrls(row.media_urls),
    articleTitle: row.article_title ?? undefined,
    articleCoverUrl: row.article_cover_url ?? undefined,
    pollQuestion: row.poll_question ?? undefined,
    pollOptions,
    pollExpiresAt: row.poll_expires_at ?? undefined,
    reactions: extras.reactions,
    userReaction: extras.userReaction,
    commentCount: extras.commentCount,
    shareCount: extras.shareCount,
    isSaved: extras.isSaved,
    comments: extras.comments ?? [],
    userPollVoteIndex: extras.userPollVoteIndex,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbComment(row: DbCommentRow): FeedComment | null {
  const author = authorFromAccount(row.author_id);
  if (!author) return null;

  return {
    id: row.id,
    author,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function loadEngagementForPosts(postIds: string[], accountId?: string) {
  const admin = createAdminClient();

  const [
    { data: reactionRows },
    { data: commentRows },
    { data: shareRows },
    saveQuery,
    pollVoteQuery,
    { data: allComments },
  ] = await Promise.all([
    admin.from("post_reactions").select("post_id, account_id, reaction").in("post_id", postIds),
    admin.from("post_comments").select("post_id").in("post_id", postIds),
    admin.from("post_shares").select("post_id").in("post_id", postIds),
    accountId
      ? admin.from("post_saves").select("post_id").eq("account_id", accountId).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    accountId
      ? admin.from("poll_votes").select("post_id, option_index").eq("voter_id", accountId).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string; option_index: number }[] }),
    admin
      .from("post_comments")
      .select("id, post_id, author_id, content, created_at, parent_id")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const maps = buildPostEngagementMaps(
    postIds,
    reactionRows as DbReactionRow[] | null,
    commentRows,
    shareRows,
    saveQuery.data,
    pollVoteQuery.data,
    accountId
  );

  const commentsByPost = new Map<string, FeedComment[]>();
  for (const row of (allComments ?? []) as DbCommentRow[]) {
    const comment = mapDbComment(row);
    if (!comment) continue;
    const list = commentsByPost.get(row.post_id) ?? [];
    list.push(comment);
    commentsByPost.set(row.post_id, list);
  }

  return { ...maps, commentsByPost };
}

export async function listFeedPostsFromSupabase(
  accountId?: string,
  options: FeedListOptions = {}
): Promise<FeedPost[]> {
  const admin = createAdminClient();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const { data: rows, error } = await admin
    .from("network_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!rows?.length) return [];

  const postRows = rows as DbNetworkPost[];
  const postIds = postRows.map((row) => row.id);
  const engagement = await loadEngagementForPosts(postIds, accountId);

  return postRows
    .map((row) =>
      mapDbPostToFeedPost(row, {
        reactions: engagement.reactionsByPost.get(row.id) ?? emptyReactions(),
        userReaction: engagement.userReactionByPost.get(row.id),
        commentCount: engagement.commentCountByPost.get(row.id) ?? 0,
        shareCount: engagement.shareCountByPost.get(row.id) ?? 0,
        isSaved: engagement.savedPostIds.has(row.id),
        comments: engagement.commentsByPost.get(row.id) ?? [],
        userPollVoteIndex: engagement.userPollVoteByPost.get(row.id),
      })
    )
    .filter((post): post is FeedPost => post !== null);
}

export async function getFeedPostFromSupabase(
  postId: string,
  accountId?: string
): Promise<FeedPost | null> {
  const admin = createAdminClient();

  const { data: row, error } = await admin.from("network_posts").select("*").eq("id", postId).maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const engagement = await loadEngagementForPosts([postId], accountId);

  return mapDbPostToFeedPost(row as DbNetworkPost, {
    reactions: engagement.reactionsByPost.get(postId) ?? emptyReactions(),
    userReaction: engagement.userReactionByPost.get(postId),
    commentCount: engagement.commentCountByPost.get(postId) ?? 0,
    shareCount: engagement.shareCountByPost.get(postId) ?? 0,
    isSaved: engagement.savedPostIds.has(postId),
    comments: engagement.commentsByPost.get(postId) ?? [],
    userPollVoteIndex: engagement.userPollVoteByPost.get(postId),
  });
}

export async function createFeedPostInSupabase(
  accountId: string,
  input: CreatePostInput
): Promise<FeedPost | null> {
  const author = authorFromAccount(accountId);
  if (!author) return null;

  const admin = createAdminClient();
  const mediaUrls =
    input.media?.map((item) => item.url) ?? input.mediaUrls ?? [];

  const { data: row, error } = await admin
    .from("network_posts")
    .insert({
      author_id: accountId,
      post_type: input.type,
      content: input.content ?? null,
      media_urls: mediaUrls,
      article_title: input.articleTitle ?? null,
      article_cover_url: input.articleCoverUrl ?? null,
      poll_question: input.pollQuestion ?? null,
      poll_options: input.pollOptions ?? null,
      poll_expires_at: input.pollExpiresAt ?? null,
      is_public: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapDbPostToFeedPost(row as DbNetworkPost, {
    reactions: emptyReactions(),
    commentCount: 0,
    shareCount: 0,
    isSaved: false,
    comments: [],
  });
}

export async function updateFeedPostInSupabase(
  accountId: string,
  postId: string,
  input: Partial<CreatePostInput>
): Promise<FeedPost | null> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("network_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing || existing.author_id !== accountId) return null;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.content !== undefined) patch.content = input.content;
  if (input.type !== undefined) patch.post_type = input.type;
  if (input.articleTitle !== undefined) patch.article_title = input.articleTitle;
  if (input.articleCoverUrl !== undefined) patch.article_cover_url = input.articleCoverUrl;
  if (input.pollQuestion !== undefined) patch.poll_question = input.pollQuestion;
  if (input.pollOptions !== undefined) patch.poll_options = input.pollOptions;
  if (input.pollExpiresAt !== undefined) patch.poll_expires_at = input.pollExpiresAt;

  if (input.media !== undefined || input.mediaUrls !== undefined) {
    patch.media_urls = input.media?.map((item) => item.url) ?? input.mediaUrls ?? [];
  }

  const { error } = await admin.from("network_posts").update(patch).eq("id", postId);
  if (error) throw error;

  return getFeedPostFromSupabase(postId, accountId);
}

export async function deleteFeedPostFromSupabase(
  accountId: string,
  postId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("network_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing || existing.author_id !== accountId) return false;

  const { error } = await admin.from("network_posts").delete().eq("id", postId);
  if (error) throw error;
  return true;
}

export async function togglePostReactionInSupabase(
  accountId: string,
  postId: string,
  type: ReactionType | null
): Promise<{ reactions: Record<ReactionType, number>; userReaction?: ReactionType } | null> {
  const admin = createAdminClient();

  const post = await getFeedPostFromSupabase(postId);
  if (!post) return null;

  const { data: existing } = await admin
    .from("post_reactions")
    .select("id, reaction")
    .eq("post_id", postId)
    .eq("account_id", accountId)
    .maybeSingle();

  const previous = existing?.reaction as ReactionType | undefined;

  if (previous === type || (type === null && previous)) {
    if (existing?.id) {
      await admin.from("post_reactions").delete().eq("id", existing.id);
    }
  } else {
    if (existing?.id) {
      await admin.from("post_reactions").update({ reaction: type }).eq("id", existing.id);
    } else if (type) {
      await admin.from("post_reactions").insert({
        post_id: postId,
        account_id: accountId,
        reaction: type,
      });
    }
  }

  const updated = await getFeedPostFromSupabase(postId, accountId);
  if (!updated) return null;

  return {
    reactions: updated.reactions,
    userReaction: updated.userReaction,
  };
}

export async function addPostCommentInSupabase(
  accountId: string,
  postId: string,
  content: string
): Promise<FeedComment | null> {
  const author = authorFromAccount(accountId);
  if (!author) return null;

  const admin = createAdminClient();
  const post = await getFeedPostFromSupabase(postId);
  if (!post) return null;

  const { data: row, error } = await admin
    .from("post_comments")
    .insert({
      post_id: postId,
      author_id: accountId,
      content,
    })
    .select("id, post_id, author_id, content, created_at, parent_id")
    .single();

  if (error) throw error;
  return mapDbComment(row as DbCommentRow);
}

export async function togglePostSaveInSupabase(
  accountId: string,
  postId: string
): Promise<boolean | null> {
  const admin = createAdminClient();
  const post = await getFeedPostFromSupabase(postId);
  if (!post) return null;

  const { data: existing } = await admin
    .from("post_saves")
    .select("id")
    .eq("post_id", postId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("post_saves").delete().eq("id", existing.id);
    return false;
  }

  await admin.from("post_saves").insert({ post_id: postId, account_id: accountId });
  return true;
}

export async function recordPostShareInSupabase(
  accountId: string,
  postId: string,
  quoteText?: string
): Promise<number | null> {
  const admin = createAdminClient();
  const post = await getFeedPostFromSupabase(postId);
  if (!post) return null;

  await admin.from("post_shares").insert({
    post_id: postId,
    sharer_id: accountId,
    quote_text: quoteText ?? null,
  });

  const updated = await getFeedPostFromSupabase(postId, accountId);
  return updated?.shareCount ?? post.shareCount + 1;
}

export async function votePollInSupabase(
  accountId: string,
  postId: string,
  optionIndex: number
): Promise<{ pollOptions: PollOption[]; userPollVoteIndex: number } | null> {
  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from("network_posts")
    .select("id, post_type, poll_options, poll_expires_at")
    .eq("id", postId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row || row.post_type !== "poll") return null;

  if (row.poll_expires_at && new Date(row.poll_expires_at).getTime() < Date.now()) {
    return null;
  }

  const pollOptions = normalizePollOptions(row.poll_options);
  if (!pollOptions || optionIndex < 0 || optionIndex >= pollOptions.length) return null;

  const { data: existingVote } = await admin
    .from("poll_votes")
    .select("id")
    .eq("post_id", postId)
    .eq("voter_id", accountId)
    .maybeSingle();

  if (existingVote?.id) return null;

  const nextOptions = pollOptions.map((option, index) =>
    index === optionIndex ? { ...option, votes: option.votes + 1 } : option
  );

  const [{ error: voteError }, { error: updateError }] = await Promise.all([
    admin.from("poll_votes").insert({
      post_id: postId,
      voter_id: accountId,
      option_index: optionIndex,
    }),
    admin.from("network_posts").update({ poll_options: nextOptions }).eq("id", postId),
  ]);

  if (voteError) throw voteError;
  if (updateError) throw updateError;

  return { pollOptions: nextOptions, userPollVoteIndex: optionIndex };
}

export async function countFeedPostsInSupabase(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("network_posts")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export interface JsonFeedMigrationPayload {
  posts: FeedPost[];
  comments: Record<string, FeedComment[]>;
  reactions: Record<string, Record<ReactionType, number>>;
  engagement: Record<
    string,
    {
      reactions: Record<string, ReactionType>;
      saved: string[];
    }
  >;
}

function resolveAuthorAccountId(author: FeedPostAuthor): string | null {
  return getAccountIdByProfileSlug(author.slug) ?? null;
}

export async function migrateJsonFeedToSupabase(payload: JsonFeedMigrationPayload): Promise<number> {
  const admin = createAdminClient();
  const existingCount = await countFeedPostsInSupabase();
  if (existingCount > 0 || payload.posts.length === 0) return 0;

  const idMap = new Map<string, string>();
  let migrated = 0;

  for (const post of payload.posts) {
    const accountId = resolveAuthorAccountId(post.author);
    if (!accountId) continue;

    const mediaUrls = post.media?.map((item) => item.url) ?? post.mediaUrls ?? [];

    const { data: inserted, error } = await admin
      .from("network_posts")
      .insert({
        author_id: accountId,
        post_type: post.type,
        content: post.content ?? null,
        media_urls: mediaUrls,
        article_title: post.articleTitle ?? null,
        article_cover_url: post.articleCoverUrl ?? null,
        poll_question: post.pollQuestion ?? null,
        poll_options: post.pollOptions ?? null,
        poll_expires_at: post.pollExpiresAt ?? null,
        is_public: true,
        created_at: post.createdAt,
        updated_at: post.updatedAt ?? post.createdAt,
      })
      .select("id")
      .single();

    if (error || !inserted) continue;

    idMap.set(post.id, inserted.id);
    migrated += 1;
  }

  for (const [accountId, engagement] of Object.entries(payload.engagement)) {
    for (const [oldPostId, reactionType] of Object.entries(engagement.reactions)) {
      const newPostId = idMap.get(oldPostId);
      if (!newPostId) continue;

      await admin.from("post_reactions").upsert(
        {
          post_id: newPostId,
          account_id: accountId,
          reaction: reactionType,
        },
        { onConflict: "post_id,account_id" }
      );
    }
  }

  for (const [oldPostId, comments] of Object.entries(payload.comments)) {
    const newPostId = idMap.get(oldPostId);
    if (!newPostId) continue;

    for (const comment of comments) {
      const commentAccountId = resolveAuthorAccountId(comment.author);
      if (!commentAccountId) continue;

      await admin.from("post_comments").insert({
        post_id: newPostId,
        author_id: commentAccountId,
        content: comment.content,
        created_at: comment.createdAt,
      });
    }
  }

  for (const [accountId, engagement] of Object.entries(payload.engagement)) {
    for (const oldPostId of engagement.saved) {
      const newPostId = idMap.get(oldPostId);
      if (!newPostId) continue;

      await admin.from("post_saves").upsert(
        { post_id: newPostId, account_id: accountId },
        { onConflict: "post_id,account_id" }
      );
    }
  }

  return migrated;
}
