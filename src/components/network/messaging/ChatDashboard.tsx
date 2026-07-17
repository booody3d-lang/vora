"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ConversationPreview } from "@/types/network";
import { DEMO_MESSAGES } from "@/lib/network/mock-data";
import { ConversationList } from "@/components/network/messaging/ConversationList";
import { MessageThread } from "@/components/network/messaging/MessageThread";
import { createClient } from "@/lib/supabase/client";

interface ChatDashboardProps {
  conversations: ConversationPreview[];
  currentUserId: string;
}

export function ChatDashboard({ conversations, currentUserId }: ChatDashboardProps) {
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>(
    DEMO_MESSAGES[activeId] ?? []
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const isChatLocked = activeConversation?.accessType === "locked";
  const canMessage = activeConversation && !isChatLocked;

  useEffect(() => {
    setMessages(DEMO_MESSAGES[activeId] ?? []);
  }, [activeId]);

  // Supabase Realtime subscription (when configured)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || !activeId) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`messages:${activeId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${activeId}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMsg]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "typing_indicators",
            filter: `conversation_id=eq.${activeId}`,
          },
          (payload) => {
            const row = payload.new as { account_id: string; is_typing: boolean };
            if (row.account_id !== currentUserId) {
              setTypingUsers((prev) => ({
                ...prev,
                [row.account_id]: row.is_typing,
              }));
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Mock mode when Supabase not configured
    }
  }, [activeId, currentUserId]);

  const sendMessage = useCallback(
    (content: string, file?: { url: string; name: string; size: number }) => {
      if (!canMessage) return;
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversationId: activeId,
        senderId: currentUserId,
        content: content || undefined,
        fileUrl: file?.url,
        fileName: file?.name,
        fileSize: file?.size,
        status: "sent",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    [activeId, currentUserId, canMessage]
  );

  const isOtherTyping = Object.values(typingUsers).some(Boolean);

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full border-r border-slate-100 md:w-80 lg:w-96">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-[#0F172A]">Messaging</h2>
          <p className="text-xs text-slate-400">
            Connected professionals &amp; company recruiters only
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </div>
      <div className="hidden flex-1 flex-col md:flex">
        {activeConversation ? (
          isChatLocked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="text-4xl">🔒</span>
              <h3 className="text-lg font-bold text-[#0F172A]">Messaging Restricted</h3>
              <p className="max-w-sm text-sm text-slate-500">
                Professional chat is available only between mutually connected accounts, or when a
                company HR manager opens a line with a job applicant.
              </p>
              <p className="text-xs text-slate-400">
                Send a connection request to {activeConversation.participant.fullName} to unlock messaging.
              </p>
            </div>
          ) : (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              currentUserId={currentUserId}
              isOtherTyping={isOtherTyping}
              onSend={sendMessage}
            />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
