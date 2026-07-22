"use client";

import { useState } from "react";
import type { ReactionType } from "@/types/network";
import { useTranslations } from "@/i18n/use-translations";
import { useGuardedAction } from "@/hooks/useGuardedAction";
import { cn } from "@/lib/utils";

interface PostReactionsProps {
  counts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  isSaved?: boolean;
  onReact: (type: ReactionType) => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export function PostReactions({
  counts,
  userReaction,
  isSaved = false,
  onReact,
  onComment,
  onShare,
  onSave,
}: PostReactionsProps) {
  const { t } = useTranslations();
  const [showPicker, setShowPicker] = useState(false);
  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({
    action: "engage_content",
  });

  const REACTIONS: { type: ReactionType; label: string; emoji: string }[] = [
    { type: "like", label: t("network.feed.reactions.like"), emoji: "👍" },
    { type: "insightful", label: t("network.feed.reactions.insightful"), emoji: "💡" },
    { type: "support", label: t("network.feed.reactions.support"), emoji: "🤝" },
    { type: "celebrate", label: t("network.feed.reactions.celebrate"), emoji: "🎉" },
  ];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function guardedReact(type: ReactionType) {
    if (execute()) onReact(type);
  }

  return (
    <div className="relative">
      {VisitorModal}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{t("network.feed.reactions.total", { count: total })}</span>
      </div>
      {restrictionMessage && (
        <p className="mt-1 text-[10px] text-amber-600">{restrictionMessage}</p>
      )}
      <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
        <div className="relative flex-1">
          <button
            type="button"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
            onClick={() => guardedReact(userReaction ?? "like")}
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
              : t("network.feed.reactions.like")}
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
                    guardedReact(type);
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
          onClick={() => {
            if (execute()) onComment?.();
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          💬 {t("network.feed.reactions.comment")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (execute()) onShare?.();
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          ↗ {t("network.feed.reactions.share")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (execute()) onSave?.();
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors hover:bg-slate-50",
            isSaved ? "text-[#3B5998]" : "text-slate-600"
          )}
        >
          🔖 {isSaved ? t("network.feed.reactions.saved") : t("network.feed.reactions.save")}
        </button>
      </div>
    </div>
  );
}
