"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ConversationPreview } from "@/types/network";
import { MessageInput } from "@/components/network/messaging/MessageInput";
import { getProfileUrl } from "@/lib/network/mock-data";
import Link from "next/link";

interface MessageThreadProps {
  conversation: ConversationPreview;
  messages: ChatMessage[];
  currentUserId: string;
  isOtherTyping: boolean;
  onSend: (content: string, file?: { url: string; name: string; size: number }) => void;
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageThread({
  conversation,
  messages,
  currentUserId,
  isOtherTyping,
  onSend,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Link href={getProfileUrl(conversation.participant.slug)}>
          <img
            src={conversation.participant.profilePhotoUrl}
            alt=""
            className="h-10 w-10 rounded-full"
          />
        </Link>
        <div>
          <Link
            href={getProfileUrl(conversation.participant.slug)}
            className="font-semibold text-[#0F172A] hover:underline"
          >
            {conversation.participant.fullName}
          </Link>
          <p className="text-xs text-slate-400">{conversation.participant.headline}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <li
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "rounded-br-sm bg-[#3B5998] text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.content && (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-1 flex items-center gap-2 text-xs ${
                        isOwn ? "text-white/80" : "text-[#3B5998]"
                      }`}
                    >
                      📎 {msg.fileName ?? "Attachment"}
                      {msg.fileSize && (
                        <span className="opacity-70">
                          ({(msg.fileSize / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      )}
                    </a>
                  )}
                  <p
                    className={`mt-1 text-[10px] ${
                      isOwn ? "text-white/60" : "text-slate-400"
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                    {isOwn && (
                      <span className="ml-1">
                        {msg.status === "read" ? " ✓✓" : msg.status === "delivered" ? " ✓✓" : " ✓"}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {isOtherTyping && (
          <p className="mt-2 text-xs italic text-[#3B5998]">
            {conversation.participant.fullName} is typing...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} />
    </div>
  );
}
