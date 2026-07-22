"use client";

import { useEffect, useState, type RefObject } from "react";
import type { FeedComment } from "@/types/network";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getProfileUrl } from "@/lib/network/urls";
import Link from "next/link";
import { useTranslations } from "@/i18n/use-translations";
import { networkFieldRoundedClass } from "@/components/network/ui/field-styles";
import { useGuardedAction } from "@/hooks/useGuardedAction";

interface PostCommentsProps {
  comments: FeedComment[];
  commentCount: number;
  onAddComment?: (content: string) => void;
  forceExpanded?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function PostComments({
  comments,
  commentCount,
  onAddComment,
  forceExpanded = false,
  inputRef,
}: PostCommentsProps) {
  const { t } = useTranslations();
  const { fullName, avatarUrl, profilePhotoUrl, gender } = useCurrentProfile();
  const [expanded, setExpanded] = useState(forceExpanded);
  const [newComment, setNewComment] = useState("");
  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({
    action: "engage_content",
  });

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const showThread = expanded || forceExpanded;

  function submitComment() {
    const text = newComment.trim();
    if (!text) return;
    if (!execute()) return;
    onAddComment?.(text);
    setNewComment("");
    setExpanded(true);
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      {VisitorModal}
      {commentCount > 0 && !forceExpanded && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mb-2 text-xs font-medium text-[#3B5998] hover:underline"
        >
          {expanded ? t("network.feed.comments.hide") : t("network.feed.comments.view")}{" "}
          {t("network.feed.comments.count", { count: commentCount })}
        </button>
      )}

      {showThread && comments.length > 0 && (
        <ul className="mb-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <Link href={getProfileUrl(comment.author.slug)}>
                <UserAvatar
                  photoUrl={comment.author.profilePhotoUrl}
                  name={comment.author.fullName}
                  className="h-8 w-8"
                />
              </Link>
              <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <Link
                  href={getProfileUrl(comment.author.slug)}
                  className="text-xs font-semibold text-[#0F172A] hover:underline"
                >
                  {comment.author.fullName}
                </Link>
                <p className="mt-0.5 text-sm text-slate-700">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <UserAvatar
          photoUrl={profilePhotoUrl || avatarUrl}
          gender={gender}
          name={fullName}
          className="h-8 w-8 shrink-0"
        />
        <div className="flex flex-1 flex-col gap-1">
          {restrictionMessage && (
            <p className="text-[10px] text-amber-600">{restrictionMessage}</p>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder={t("network.feed.comments.placeholder")}
              className={networkFieldRoundedClass}
            />
            <button
              type="button"
              disabled={!newComment.trim()}
              onClick={submitComment}
              className="rounded-full bg-[#3B5998] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {t("network.feed.comments.post")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
