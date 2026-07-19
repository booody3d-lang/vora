"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ConversationPreview, MessageAttachment } from "@/types/network";
import { MessageInput } from "@/components/network/messaging/MessageInput";
import { ChatMessageMedia } from "@/components/network/messaging/ChatMessageMedia";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PresenceIndicator } from "@/components/ui/PresenceIndicator";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getProfileUrl } from "@/lib/network/urls";
import { useTranslations } from "@/i18n/use-translations";
import Link from "next/link";

interface MessageThreadProps {
  conversation: ConversationPreview;
  messages: ChatMessage[];
  currentUserId: string;
  isOtherTyping: boolean;
  onSend: (content: string, file?: MessageAttachment) => void | Promise<boolean | void>;
  disabled?: boolean;
  compact?: boolean;
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
  disabled = false,
  compact = false,
}: MessageThreadProps) {
  const { t } = useTranslations();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { fullName, avatarUrl, profilePhotoUrl, gender } = useCurrentProfile();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Link href={getProfileUrl(conversation.participant.slug)} className="relative shrink-0">
          <UserAvatar
            photoUrl={conversation.participant.profilePhotoUrl}
            gender={conversation.participant.gender}
            name={conversation.participant.fullName}
            className={compact ? "h-9 w-9 border border-slate-200" : "h-10 w-10 border border-slate-200"}
          />
          <PresenceIndicator
            isOnline={conversation.participant.isOnline}
            className="-bottom-0.5 -end-0.5"
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={getProfileUrl(conversation.participant.slug)}
            className="font-semibold text-[#0F172A] hover:underline"
          >
            {conversation.participant.fullName}
          </Link>
          <p className="truncate text-xs text-slate-400">
            {conversation.participant.isOnline
              ? t("network.messagingOnline")
              : conversation.participant.headline}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
        <ul className="space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <li
                key={msg.id}
                className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && (
                  <UserAvatar
                    photoUrl={conversation.participant.profilePhotoUrl}
                    gender={conversation.participant.gender}
                    name={conversation.participant.fullName}
                    className="h-8 w-8 shrink-0"
                  />
                )}
                <div
                  className={`max-w-[min(75%,320px)] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? "rounded-br-sm bg-[#3B5998] text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {msg.content && (
                    <p className="text-sm leading-relaxed" dir="auto">
                      {msg.content}
                    </p>
                  )}
                  <ChatMessageMedia message={msg} isOwn={isOwn} />
                  <p
                    className={`mt-1 flex items-center gap-1 text-[10px] ${
                      isOwn ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isOwn && (
                      <span className={msg.status === "read" ? "text-sky-200" : ""}>
                        {msg.status === "read" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </p>
                </div>
                {isOwn && (
                  <UserAvatar
                    photoUrl={profilePhotoUrl || avatarUrl}
                    gender={gender}
                    name={fullName}
                    className="h-8 w-8 shrink-0 border border-[#3B5998]/30"
                  />
                )}
              </li>
            );
          })}
        </ul>
        {isOtherTyping && (
          <p className="mt-2 text-xs italic text-[#3B5998]">
            {t("network.messagingTyping", { name: conversation.participant.fullName })}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} disabled={disabled} />
    </div>
  );
}
