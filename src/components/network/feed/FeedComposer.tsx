"use client";

import { useState } from "react";
import type { PostType } from "@/types/network";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

const POST_TYPE_KEYS: { type: PostType; labelKey: string; icon: string }[] = [
  { type: "text", labelKey: "network.post", icon: "📝" },
  { type: "image", labelKey: "network.photo", icon: "🖼️" },
  { type: "video", labelKey: "network.video", icon: "🎬" },
  { type: "article", labelKey: "network.article", icon: "📰" },
  { type: "poll", labelKey: "network.poll", icon: "📊" },
];

interface FeedComposerProps {
  onPublish?: (type: PostType, content: string) => void;
}

export function FeedComposer({ onPublish }: FeedComposerProps) {
  const { t } = useTranslations();
  const [content, setContent] = useState("");
  const [activeType, setActiveType] = useState<PostType>("text");
  const [expanded, setExpanded] = useState(false);

  function placeholderForType(type: PostType): string {
    if (type === "poll") return t("network.feedPollPlaceholder");
    if (type === "article") return t("network.feedArticlePlaceholder");
    return t("network.feedSharePlaceholder");
  }

  function handlePublish() {
    if (!content.trim()) return;
    onPublish?.(activeType, content);
    setContent("");
    setExpanded(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
          alt=""
          className="h-12 w-12 shrink-0 rounded-full border border-slate-200"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-left text-sm text-slate-400 transition-colors hover:border-[#3B5998]/40 hover:bg-slate-50"
        >
          {t("network.startPost")}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {POST_TYPE_KEYS.map(({ type, labelKey, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeType === type
                    ? "bg-[#3B5998] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {icon} {t(labelKey)}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholderForType(activeType)}
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#3B5998]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!content.trim()}
              className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {t("network.publish")}
            </button>
          </div>
        </div>
      )}

      {!expanded && (
        <div className="flex justify-around border-t border-slate-100 py-2">
          {POST_TYPE_KEYS.slice(0, 4).map(({ type, labelKey, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                setExpanded(true);
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              {icon} {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
