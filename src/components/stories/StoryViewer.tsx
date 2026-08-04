"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StoryItem, StoryOwnerGroup } from "@/types/albums-stories";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  group: StoryOwnerGroup;
  onClose: () => void;
  onExhausted?: () => void;
}

export function StoryViewer({ group, onClose, onExhausted }: StoryViewerProps) {
  const { t } = useTranslations();
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const story: StoryItem | undefined = group.stories[index];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!story) return;
    void fetch(`/api/stories/${story.id}/view`, {
      method: "POST",
      credentials: "include",
    });
  }, [story?.id]);

  useEffect(() => {
    if (!story) return;
    const ms =
      story.mediaType === "video"
        ? Math.min(15000, Math.max(3000, (story.durationSeconds ?? 5) * 1000))
        : 5000;
    const timer = setTimeout(() => {
      if (index < group.stories.length - 1) setIndex((i) => i + 1);
      else if (onExhausted) onExhausted();
      else onClose();
    }, ms);
    return () => clearTimeout(timer);
  }, [story?.id, index, group.stories.length, onClose, onExhausted, story]);

  if (!mounted || !story) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95">
      <div className="relative h-full w-full max-w-md">
        <div className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className={cn(
                  "h-full bg-white transition-all",
                  i < index ? "w-full" : i === index ? "w-full animate-pulse" : "w-0"
                )}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 top-[max(1.75rem,calc(env(safe-area-inset-top)+1rem))] z-20 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-semibold">{group.displayName}</p>
            <p className="text-[11px] text-white/60">{t("stories.expiresIn24h")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          className="absolute inset-y-0 start-0 z-10 w-1/3"
          aria-label="Previous"
          onClick={() => {
            if (index > 0) setIndex((i) => i - 1);
          }}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 z-10 w-1/3"
          aria-label="Next"
          onClick={() => {
            if (index < group.stories.length - 1) setIndex((i) => i + 1);
            else if (onExhausted) onExhausted();
            else onClose();
          }}
        />

        <div className="flex h-full items-center justify-center p-2">
          {story.mediaType === "video" ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={false}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={story.id}
              src={story.mediaUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
