"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageAttachment } from "@/types/network";
import { ConversationList } from "@/components/network/messaging/ConversationList";
import { MessageThread } from "@/components/network/messaging/MessageThread";
import { NewConversationPanel } from "@/components/network/messaging/NewConversationPanel";
import { useMessaging } from "@/hooks/useMessaging";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useTranslations } from "@/i18n/use-translations";

interface MessagingShellProps {
  className?: string;
  compact?: boolean;
  initialConversationId?: string;
  initialTargetAccountId?: string;
  showMobileThread?: boolean;
}

export function MessagingShell({
  className = "",
  compact = false,
  initialConversationId,
  initialTargetAccountId,
  showMobileThread = false,
}: MessagingShellProps) {
  const { t } = useTranslations();
  const { profile } = useCurrentProfile();
  const currentUserId = profile?.id ?? "";
  const [newOpen, setNewOpen] = useState(false);
  const startedTargetRef = useRef<string | null>(null);

  const {
    conversations,
    activeId,
    setActiveId,
    activeConversation,
    messages,
    loading,
    sendMessage,
    startConversation,
  } = useMessaging({ initialConversationId });

  useEffect(() => {
    if (initialConversationId || !initialTargetAccountId || loading) return;
    if (startedTargetRef.current === initialTargetAccountId) return;
    startedTargetRef.current = initialTargetAccountId;
    void startConversation(initialTargetAccountId);
  }, [initialConversationId, initialTargetAccountId, loading, startConversation]);

  const isChatLocked = activeConversation?.accessType === "locked";
  const canMessage = activeConversation && !isChatLocked;

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 ${className}`}
      >
        {t("common.loading")}
      </div>
    );
  }

  const heightClass = compact ? "h-[420px]" : "h-[calc(100vh-120px)]";

  return (
    <div
      className={`flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${heightClass} ${className}`}
    >
      <div
        className={`w-full border-e border-slate-100 ${compact ? "w-44 md:w-52" : "md:w-80 lg:w-96"} ${
          showMobileThread && activeId ? "hidden md:block" : "block"
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-[#0F172A]">{t("network.messages")}</h2>
              {!compact && (
                <p className="text-xs text-slate-400">{t("network.messagingSubtitle")}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setNewOpen((open) => !open)}
              className="shrink-0 rounded-lg bg-[#3B5998] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {t("network.messagingNew")}
            </button>
          </div>
        </div>
        <NewConversationPanel
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onSelect={async (targetAccountId) => {
            await startConversation(targetAccountId);
            setNewOpen(false);
          }}
        />
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          emptyLabel={t("network.messagingNoConversations")}
          compact={compact}
        />
      </div>

      <div
        className={`flex flex-1 flex-col ${showMobileThread || compact ? "flex" : "hidden md:flex"}`}
      >
        {activeConversation ? (
          isChatLocked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="text-4xl">🔒</span>
              <h3 className="text-lg font-bold text-[#0F172A]">
                {t("network.messagingLockedTitle")}
              </h3>
              <p className="max-w-sm text-sm text-slate-500">
                {t("network.messagingLockedBody")}
              </p>
            </div>
          ) : (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              currentUserId={currentUserId}
              isOtherTyping={false}
              onSend={(content, file) => {
                if (!canMessage) return;
                void sendMessage(content, file as MessageAttachment | undefined);
              }}
              disabled={!canMessage}
              compact={compact}
            />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            {t("network.messagingSelectConversation")}
          </div>
        )}
      </div>
    </div>
  );
}
