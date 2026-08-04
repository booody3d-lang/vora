"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/network";
import { inferMediaType } from "@/lib/media/upload-client";
import { formatDuration } from "@/lib/calls/call-events";
import { cn } from "@/lib/utils";

interface ChatMessageMediaProps {
  message: ChatMessage;
  isOwn: boolean;
}

function VoiceNoteBar({
  src,
  durationSeconds,
  isOwn,
}: {
  src: string;
  durationSeconds?: number;
  isOwn: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(durationSeconds && durationSeconds > 0 ? durationSeconds : 0);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => {
      setCurrent(audio.currentTime);
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotal(audio.duration);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [src]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  const bars = [3, 7, 5, 9, 4, 8, 6, 10, 5, 7, 4, 9, 6, 8, 5, 7, 4, 6, 8, 5];
  const displaySec = playing || current > 0 ? current : total;
  const label = formatDuration(Math.max(0, Math.round(displaySec || durationSeconds || 0)));

  return (
    <div className="mt-0.5 flex w-[13.5rem] max-w-full items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95",
          isOwn ? "bg-white/20 text-white" : "bg-[#3B5998]/12 text-[#3B5998]"
        )}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex h-5 items-end gap-[2px]">
          {bars.map((h, i) => {
            const filled = progress > 0 && i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors",
                  filled
                    ? isOwn
                      ? "bg-white"
                      : "bg-[#3B5998]"
                    : isOwn
                      ? "bg-white/35"
                      : "bg-slate-300"
                )}
                style={{ height: `${h * 1.6}px` }}
              />
            );
          })}
        </div>
        <p
          className={cn(
            "mt-0.5 font-mono text-[10px] tabular-nums leading-none",
            isOwn ? "text-white/70" : "text-slate-500"
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

export function ChatMessageMedia({ message, isOwn }: ChatMessageMediaProps) {
  if (!message.fileUrl) return null;

  if (message.fileUrl.startsWith("blob:")) {
    return (
      <p className={`mt-1 text-xs italic ${isOwn ? "text-white/70" : "text-slate-500"}`}>
        Attachment unavailable — please resend
      </p>
    );
  }

  const mediaType =
    message.mediaType ??
    inferMediaType(message.mimeType, message.fileName ?? message.fileUrl);

  if (mediaType === "image") {
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block overflow-hidden rounded-lg bg-black/5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={message.fileUrl}
          alt={message.fileName ?? "Image attachment"}
          className="max-h-64 max-w-full object-contain"
          loading="lazy"
        />
      </a>
    );
  }

  if (mediaType === "video") {
    return (
      <div className="mt-1 overflow-hidden rounded-lg bg-black">
        <video
          src={message.fileUrl}
          controls
          playsInline
          className="max-h-64 w-full object-contain"
        />
        {message.durationSeconds && (
          <p className={`px-2 py-1 text-[10px] ${isOwn ? "text-white/70" : "text-slate-500"}`}>
            {message.durationSeconds.toFixed(1)}s
          </p>
        )}
      </div>
    );
  }

  if (mediaType === "audio") {
    return (
      <VoiceNoteBar
        src={message.fileUrl}
        durationSeconds={message.durationSeconds}
        isOwn={isOwn}
      />
    );
  }

  return (
    <a
      href={message.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1 flex items-center gap-2 text-xs ${
        isOwn ? "text-white/80 hover:text-white" : "text-[#3B5998] hover:underline"
      }`}
    >
      📎 {message.fileName ?? "Attachment"}
      {message.fileSize && (
        <span className="opacity-70">({(message.fileSize / 1024 / 1024).toFixed(1)} MB)</span>
      )}
    </a>
  );
}
