"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { FeedComment, FeedPost, ReactionType } from "@/types/network";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getProfileUrl } from "@/lib/network/urls";
import { PostReactions } from "@/components/network/feed/PostReactions";
import { PostComments } from "@/components/network/feed/PostComments";
import { FeedPostMedia } from "@/components/network/feed/FeedPostMedia";
import { PollDisplay } from "@/components/network/feed/PollDisplay";
import { SharePostModal } from "@/components/network/feed/SharePostModal";
import { EditPostModal } from "@/components/network/feed/EditPostModal";
import { ReportButton } from "@/components/security/ReportButton";
import { useTranslations } from "@/i18n/use-translations";
import { useGuardedAction } from "@/hooks/useGuardedAction";
import { usePermissions } from "@/providers/VoraProviders";

const TRUNCATE_LENGTH = 280;

interface FeedPostCardProps {
  post: FeedPost;
  onUpdate?: (post: FeedPost) => void;
  onDelete?: (postId: string) => void;
}

export function FeedPostCard({ post: initialPost, onUpdate, onDelete }: FeedPostCardProps) {
  const { t } = useTranslations();
  const { user } = usePermissions();
  const { profile, fullName, avatarUrl, profilePhotoUrl, gender, subscriptionBadge } =
    useCurrentProfile();
  const commentInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState(initialPost);
  const [reactions, setReactions] = useState(initialPost.reactions);
  const [userReaction, setUserReaction] = useState(initialPost.userReaction);
  const [isSaved, setIsSaved] = useState(initialPost.isSaved);
  const [expanded, setExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localComments, setLocalComments] = useState<FeedComment[]>(post.comments ?? []);
  const { execute } = useGuardedAction({ action: "engage_content" });

  const isOwnPost =
    (user?.id && post.authorAccountId && user.id === post.authorAccountId) ||
    profile?.id === post.author.id;

  const author = isOwnPost
    ? {
        ...post.author,
        fullName: fullName || post.author.fullName,
        headline: profile?.headline ?? post.author.headline,
        profilePhotoUrl: profilePhotoUrl || avatarUrl || post.author.profilePhotoUrl,
        subscriptionBadge: subscriptionBadge ?? post.author.subscriptionBadge,
      }
    : post.author;

  function syncPost(next: Partial<FeedPost>) {
    setPost((current) => {
      const updated = { ...current, ...next };
      onUpdate?.(updated);
      return updated;
    });
  }

  const isLong = (post.content?.length ?? 0) > TRUNCATE_LENGTH;
  const displayContent =
    isLong && !expanded ? `${post.content?.slice(0, TRUNCATE_LENGTH)}...` : post.content;

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t("network.feed.timeJustNow");
    if (hours < 24) return t("network.feed.timeHoursAgo", { hours });
    return t("network.feed.timeDaysAgo", { days: Math.floor(hours / 24) });
  }

  async function handleReact(type: ReactionType) {
    if (!execute()) return;

    const nextType = userReaction === type ? null : type;
    const res = await fetch(`/api/feed/${post.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: nextType }),
    });
    const data = await res.json();
    if (!res.ok) return;

    setReactions(data.reactions);
    setUserReaction(data.userReaction);
    syncPost({ reactions: data.reactions, userReaction: data.userReaction });
  }

  async function handleVote(index: number) {
    if (!post.pollOptions || !execute()) return;

    const res = await fetch(`/api/feed/${post.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ optionIndex: index }),
    });
    const data = await res.json();
    if (!res.ok) return;

    const pollOptions = data.pollOptions as FeedPost["pollOptions"];
    const userPollVoteIndex = data.userPollVoteIndex as number;
    syncPost({ pollOptions, userPollVoteIndex });
    setPost((current) => ({ ...current, pollOptions, userPollVoteIndex }));
  }

  async function handleAddComment(content: string) {
    if (!execute()) return;

    const res = await fetch(`/api/feed/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) return;

    const comment = data.comment as FeedComment;
    setLocalComments((prev) => [...prev, comment]);
    const commentCount = post.commentCount + 1;
    syncPost({ commentCount, comments: [...localComments, comment] });
    setPost((current) => ({ ...current, commentCount }));
    setCommentsExpanded(true);
  }

  async function handleSave() {
    if (!execute()) return;

    const res = await fetch(`/api/feed/${post.id}/save`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return;

    setIsSaved(data.isSaved);
    syncPost({ isSaved: data.isSaved });
  }

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm(t("network.feed.delete.confirm"))) return;

    setDeleting(true);
    setMenuOpen(false);

    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;
      onDelete?.(post.id);
    } finally {
      setDeleting(false);
    }
  }

  function focusCommentInput() {
    setCommentsExpanded(true);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  }

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Link href={getProfileUrl(author.slug)}>
              <UserAvatar
                photoUrl={author.profilePhotoUrl}
                gender={isOwnPost ? gender : undefined}
                name={author.fullName}
                tierBadge={author.subscriptionBadge}
                className="h-12 w-12 border border-slate-200"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={getProfileUrl(author.slug)}
                className="font-semibold text-[#0F172A] hover:underline"
              >
                {author.fullName}
              </Link>
              <p className="text-xs text-slate-500">{author.headline}</p>
              <p className="text-[10px] text-slate-400">
                {timeAgo(post.createdAt)}
                {post.updatedAt && post.updatedAt !== post.createdAt && (
                  <span className="ms-1">· {t("network.feed.edited")}</span>
                )}
              </p>
            </div>
            <div className="flex items-start gap-1">
              {isOwnPost && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    aria-label={t("network.feed.postMenu")}
                    onClick={() => setMenuOpen((open) => !open)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label={t("common.cancel")}
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute end-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setEditOpen(true);
                          }}
                          className="block w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => void handleDelete()}
                          className="block w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deleting ? t("network.feed.delete.deleting") : t("common.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isOwnPost && (
                <ReportButton
                  targetType="post"
                  targetId={post.id}
                  targetLabel={`Post by ${author.fullName}`}
                />
              )}
            </div>
          </div>

          {post.type === "article" && post.articleCoverUrl && (
            <div className="mt-3 block overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.articleCoverUrl}
                alt=""
                className="max-h-64 w-full object-contain"
              />
              {post.articleTitle && (
                <h3 className="mt-2 text-lg font-bold text-[#0F172A]">{post.articleTitle}</h3>
              )}
            </div>
          )}

          {post.type === "video" && (() => {
            const videoItem = post.media?.[0];
            const videoUrl = videoItem?.url ?? post.mediaUrls?.[0];
            if (!videoUrl) return null;
            const isVideo =
              videoItem?.mimeType?.startsWith("video/") ||
              /\.(mp4|webm|mov)(\?|$)/i.test(videoUrl);
            return (
              <div className="mt-3 overflow-hidden rounded-lg bg-black">
                {isVideo ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="max-h-80 w-full object-contain"
                  />
                ) : (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 text-sm text-[#93C5FD] hover:underline"
                  >
                    {videoUrl}
                  </a>
                )}
                {videoItem?.durationSeconds && (
                  <p className="px-3 py-1 text-[10px] text-white/70">
                    {videoItem.durationSeconds.toFixed(1)}s
                  </p>
                )}
              </div>
            );
          })()}

          {displayContent && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {displayContent}
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="ms-1 font-medium text-[#3B5998] hover:underline"
                >
                  {expanded ? t("network.feed.seeLess") : t("network.feed.seeMore")}
                </button>
              )}
            </p>
          )}

          {post.type === "image" && (post.media?.length || post.mediaUrls?.length) && (
            <FeedPostMedia
              media={
                post.media ??
                post.mediaUrls!.map((url) => ({ url, width: 0, height: 0 }))
              }
            />
          )}

          {post.type === "poll" && post.pollQuestion && post.pollOptions && (
            <PollDisplay
              question={post.pollQuestion}
              options={post.pollOptions}
              expiresAt={post.pollExpiresAt}
              initialVotedIndex={post.userPollVoteIndex ?? null}
              onVote={(index) => void handleVote(index)}
            />
          )}

          <PostReactions
            counts={reactions}
            userReaction={userReaction}
            isSaved={isSaved}
            onReact={(type) => void handleReact(type)}
            onComment={focusCommentInput}
            onShare={() => {
              if (execute()) setShareOpen(true);
            }}
            onSave={() => void handleSave()}
          />

          <PostComments
            comments={localComments}
            commentCount={post.commentCount}
            onAddComment={(content) => void handleAddComment(content)}
            forceExpanded={commentsExpanded}
            inputRef={commentInputRef}
          />
        </div>
      </article>

      {shareOpen && <SharePostModal postId={post.id} onClose={() => setShareOpen(false)} />}
      {editOpen && (
        <EditPostModal
          post={post}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setPost(updated);
            onUpdate?.(updated);
          }}
        />
      )}
    </>
  );
}
