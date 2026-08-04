"use client";

import type { CallChatEvent } from "@/lib/calls/call-events";
import { callEventLabelKey, formatDuration } from "@/lib/calls/call-events";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface CallEventBubbleProps {
  event: CallChatEvent;
}

export function CallEventBubble({ event }: CallEventBubbleProps) {
  const { t } = useTranslations();
  const isMissed = event.kind === "missed" || event.kind === "declined" || event.kind === "cancelled";
  const icon = event.mode === "video" ? "📹" : "🎙️";

  return (
    <div className="flex justify-center py-1">
      <div
        className={cn(
          "inline-flex max-w-[90%] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm",
          isMissed
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
        )}
      >
        <span aria-hidden>{icon}</span>
        <span>{t(callEventLabelKey(event.kind))}</span>
        <span className="text-[10px] opacity-70">
          {event.mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
        </span>
        {(event.durationSec ?? 0) > 0 && (
          <span className="font-mono text-[10px] opacity-80">{formatDuration(event.durationSec ?? 0)}</span>
        )}
      </div>
    </div>
  );
}
