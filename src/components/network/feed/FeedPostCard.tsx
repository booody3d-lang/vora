"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedPost, ReactionType } from "@/types/network";
import { getProfileUrl } from "@/lib/network/mock-data";
import { PostReactions } from "@/components/network/feed/PostReactions";
import { PostComments } from "@/components/network/feed/PostComments";
import { PollDisplay } from "@/components/network/feed/PollDisplay";
import { ReportButton } from "@/components/security/ReportButton";
import { cn } from "@/lib/utils";

const TRUNCATE_LENGTH = 280;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface FeedPostCardProps {
  post: FeedPost;
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const [reactions, setReactions] = useState(post.reactions);
  const [userReaction, setUserReaction] = useState(post.userReaction);
  const [expanded, setExpanded] = useState(false);

  const isLong = (post.content?.length ?? 0) > TRUNCATE_LENGTH;
  const displayContent =
    isLong && !expanded
      ? post.content?.slice(0, TRUNCATE_LENGTH) + "..."
      : post.content;

  function handleReact(type: ReactionType) {
    if (userReaction === type) {
      setReactions((r) => ({ ...r, [type]: Math.max(0, r[type] - 1) }));
      setUserReaction(undefined);
    } else {
      if (userReaction) {
        setReactions((r) => ({
          ...r,
          [userReaction]: Math.max(0, r[userReaction] - 1),
          [type]: r[type] + 1,
        }));
      } else {
        setReactions((r) => ({ ...r, [type]: r[type] + 1 }));
      }
      setUserReaction(type);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link href={getProfileUrl(post.author.slug)}>
            <img
              src={post.author.profilePhotoUrl}
              alt=""
              className="h-12 w-12 rounded-full border border-slate-200"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={getProfileUrl(post.author.slug)}
              className="font-semibold text-[#0F172A] hover:underline"
            >
              {post.author.fullName}
            </Link>
            <p className="text-xs text-slate-500">{post.author.headline}</p>
            <p className="text-[10px] text-slate-400">{timeAgo(post.createdAt)}</p>
          </div>
          <ReportButton targetType="post" targetId={post.id} targetLabel={`Post by ${post.author.fullName}`} />
        </div>

        {post.type === "article" && post.articleCoverUrl && (
          <Link href="#" className="mt-3 block overflow-hidden rounded-lg">
            <img
              src={post.articleCoverUrl}
              alt=""
              className="h-48 w-full object-cover transition-transform hover:scale-[1.02]"
            />
            {post.articleTitle && (
              <h3 className="mt-2 text-lg font-bold text-[#0F172A]">{post.articleTitle}</h3>
            )}
          </Link>
        )}

        {displayContent && (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {displayContent}
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-1 font-medium text-[#3B5998] hover:underline"
              >
                {expanded ? "See less" : "See more"}
              </button>
            )}
          </p>
        )}

        {post.type === "image" && post.mediaUrls && (
          <div
            className={cn(
              "mt-3 grid gap-2",
              post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {post.mediaUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: post.mediaUrls!.length > 1 ? 200 : 320 }}
              />
            ))}
          </div>
        )}

        {post.type === "poll" && post.pollQuestion && post.pollOptions && (
          <PollDisplay
            question={post.pollQuestion}
            options={post.pollOptions}
            expiresAt={post.pollExpiresAt}
          />
        )}

        <PostReactions
          counts={reactions}
          userReaction={userReaction}
          onReact={handleReact}
        />

        {(post.comments || post.commentCount > 0) && (
          <PostComments
            comments={post.comments ?? []}
            commentCount={post.commentCount}
          />
        )}
      </div>
    </article>
  );
}
