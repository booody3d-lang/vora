"use client";

import type { ChatMessage } from "@/types/network";
import { inferMediaType } from "@/lib/media/upload-client";

interface ChatMessageMediaProps {
  message: ChatMessage;
  isOwn: boolean;
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
