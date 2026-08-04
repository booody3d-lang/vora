"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageAttachment } from "@/types/network";
import { ConversationList } from "@/components/network/messaging/ConversationList";
import { MessageThread } from "@/components/network/messaging/MessageThread";
import { MessagingOwnerFollowersPanel } from "@/components/network/messaging/MessagingOwnerFollowersPanel";
import { NewConversationPanel } from "@/components/network/messaging/NewConversationPanel";
import { useMessaging } from "@/hooks/useMessaging";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { usePermissions } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

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
  const { user } = usePermissions();
  const currentUserId = profile?.accountId ?? profile?.id ?? user?.id ?? "";
  const [newOpen, setNewOpen] = useState(false);
  const [starting, setStarting] = useState(false);
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
    setStarting(true);
    void startConversation(initialTargetAccountId).finally(() => setStarting(false));
  }, [initialConversationId, initialTargetAccountId, loading, startConversation]);

  const isChatLocked = activeConversation?.accessType === "locked";
  const canMessage = Boolean(activeConversation && !isChatLocked);
  const showThread = Boolean(activeId && activeConversation);

  // compact dock: list OR thread (never both cramped)
  // messages page: list hidden on small screens when a thread is open
  const listVisibleClass = compact
    ? showThread
      ? "hidden"
      : "flex w-full"
    : showMobileThread && showThread
      ? "hidden md:flex md:w-80 lg:w-96 md:shrink-0"
      : "flex w-full md:w-80 lg:w-96 md:shrink-0";

  const threadVisibleClass = compact
    ? showThread
      ? "flex"
      : "hidden"
    : showMobileThread
      ? showThread
        ? "flex"
        : "hidden md:flex"
      : "hidden md:flex";

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500",
          compact ? "h-full" : "h-[min(720px,calc(100dvh-7rem))]",
          className
        )}
      >
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        compact ? "h-full" : "h-[min(720px,calc(100dvh-7rem))]",
        className
      )}
    >
      <div className={cn("min-h-0 flex-col border-e border-slate-100", listVisibleClass)}>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={cn("font-bold text-[#0F172A]", compact ? "text-sm" : "text-base")}>
                {t("network.messages")}
              </h2>
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
        <MessagingOwnerFollowersPanel
          compact={compact}
          onMessageFollower={(targetAccountId) => {
            setStarting(true);
            void startConversation(targetAccountId).finally(() => setStarting(false));
          }}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            emptyLabel={t("network.messagingNoConversations")}
            compact={compact}
          />
        </div>
      </div>

      <div className={cn("min-h-0 min-w-0 flex-1 flex-col", threadVisibleClass)}>
        {compact && showThread && (
          <button
            type="button"
            onClick={() => setActiveId("")}
            className="shrink-0 border-b border-slate-100 px-3 py-2 text-start text-xs font-semibold text-[#3B5998] hover:bg-slate-50"
          >
            ← {t("network.messages")}
          </button>
        )}
        {showMobileThread && showThread && !compact && (
          <button
            type="button"
            onClick={() => setActiveId("")}
            className="shrink-0 border-b border-slate-100 px-3 py-2 text-start text-xs font-semibold text-[#3B5998] hover:bg-slate-50 md:hidden"
          >
            ← {t("network.messages")}
          </button>
        )}
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
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
            {starting ? t("common.loading") : t("network.messagingSelectConversation")}
          </div>
        )}
      </div>
    </div>
  );
}
