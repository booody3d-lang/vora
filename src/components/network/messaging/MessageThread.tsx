"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ConversationPreview, MessageAttachment } from "@/types/network";
import { CallControls } from "@/components/calls/CallControls";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id ?? "";
  const { fullName, avatarUrl, profilePhotoUrl, gender } = useCurrentProfile();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll only the thread pane — never the whole page (avoids layout jump).
    el.scrollTop = el.scrollHeight;
  }, [lastMessageId, isOtherTyping, messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
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
            className="block truncate font-semibold text-[#0F172A] hover:underline"
          >
            {conversation.participant.fullName}
          </Link>
          <p className="truncate text-xs text-slate-400">
            {conversation.participant.isOnline
              ? t("network.messagingOnline")
              : conversation.participant.headline || t("network.messagingSelectConversation")}
          </p>
        </div>
        <CallControls
          contextType="network"
          contextId={conversation.id}
          localAccountId={currentUserId}
          peerLabel={conversation.participant.fullName}
          disabled={disabled}
          compact={compact}
        />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-3 sm:px-4 sm:py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{t("network.messagingSelectConversation")}</p>
        ) : (
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
                    className={`max-w-[min(85%,360px)] rounded-2xl px-4 py-2.5 shadow-sm ${
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
        )}
        {isOtherTyping && (
          <p className="mt-2 text-xs italic text-[#3B5998]">
            {t("network.messagingTyping", { name: conversation.participant.fullName })}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <MessageInput onSend={onSend} disabled={disabled} />
      </div>
    </div>
  );
}
