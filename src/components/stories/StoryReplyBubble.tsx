"use client";

import type { StoryReplyEvent } from "@/lib/albums-stories/story-reply-events";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface StoryReplyBubbleProps {
  event: StoryReplyEvent;
  isOwn: boolean;
}

export function StoryReplyBubble({ event, isOwn }: StoryReplyBubbleProps) {
  const { t } = useTranslations();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl shadow-sm",
        isOwn ? "bg-[#3B5998] text-white" : "border border-slate-200 bg-white text-slate-800"
      )}
    >
      <div className={cn("flex gap-2 border-b p-2", isOwn ? "border-white/15" : "border-slate-100")}>
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black/20">
          {event.mediaType === "video" ? (
            <video src={event.mediaUrl} muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.mediaUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 self-center">
          <p className={cn("text-[11px] font-semibold", isOwn ? "text-white/80" : "text-[#3B5998]")}>
            {t("stories.repliedToStory")}
          </p>
          <p className={cn("truncate text-[10px]", isOwn ? "text-white/55" : "text-slate-400")}>
            {t("stories.replyKeepsThumbnail")}
          </p>
        </div>
      </div>
      {event.text && (
        <p className="px-3 py-2.5 text-sm leading-relaxed" dir="auto">
          {event.text}
        </p>
      )}
    </div>
  );
}
