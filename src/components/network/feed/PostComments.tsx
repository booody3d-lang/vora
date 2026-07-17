"use client";

import { useState } from "react";
import type { FeedComment } from "@/types/network";
import { getProfileUrl } from "@/lib/network/mock-data";
import Link from "next/link";

interface PostCommentsProps {
  comments: FeedComment[];
  commentCount: number;
}

export function PostComments({ comments, commentCount }: PostCommentsProps) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");

  return (
    <div className="border-t border-slate-100 pt-3">
      {commentCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mb-2 text-xs font-medium text-[#3B5998] hover:underline"
        >
          {expanded ? "Hide" : "View"} {commentCount} comment{commentCount !== 1 ? "s" : ""}
        </button>
      )}

      {expanded && (
        <ul className="mb-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <Link href={getProfileUrl(comment.author.slug)}>
                <img
                  src={comment.author.profilePhotoUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full"
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
                <button
                  type="button"
                  className="mt-1 text-[10px] font-medium text-slate-400 hover:text-[#3B5998]"
                >
                  Reply
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
          alt=""
          className="h-8 w-8 shrink-0 rounded-full"
        />
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @ to mention"
            className="flex-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#3B5998]"
          />
          <button
            type="button"
            disabled={!newComment.trim()}
            className="rounded-full bg-[#3B5998] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
