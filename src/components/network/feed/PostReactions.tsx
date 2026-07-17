"use client";

import { useState } from "react";
import type { ReactionType } from "@/types/network";
import { cn } from "@/lib/utils";

const REACTIONS: { type: ReactionType; label: string; emoji: string }[] = [
  { type: "like", label: "Like", emoji: "👍" },
  { type: "insightful", label: "Insightful", emoji: "💡" },
  { type: "support", label: "Support", emoji: "🤝" },
  { type: "celebrate", label: "Celebrate", emoji: "🎉" },
];

interface PostReactionsProps {
  counts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  onReact: (type: ReactionType) => void;
}

export function PostReactions({ counts, userReaction, onReact }: PostReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="relative">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total} reactions</span>
      </div>
      <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
        <div className="relative flex-1">
          <button
            type="button"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
            onClick={() => onReact(userReaction ? "like" : "like")}
            className={cn(
              "flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors hover:bg-slate-50",
              userReaction ? "text-[#3B5998]" : "text-slate-600"
            )}
          >
            {userReaction
              ? REACTIONS.find((r) => r.type === userReaction)?.emoji
              : "👍"}{" "}
            {userReaction
              ? REACTIONS.find((r) => r.type === userReaction)?.label
              : "Like"}
          </button>
          {showPicker && (
            <div
              className="absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-lg"
              onMouseEnter={() => setShowPicker(true)}
              onMouseLeave={() => setShowPicker(false)}
            >
              {REACTIONS.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  type="button"
                  title={label}
                  onClick={() => {
                    onReact(type);
                    setShowPicker(false);
                  }}
                  className="rounded-full p-1.5 text-lg transition-transform hover:scale-125 hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          💬 Comment
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          ↗ Share
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          🔖 Save
        </button>
      </div>
    </div>
  );
}
