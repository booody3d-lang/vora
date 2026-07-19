"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ConversationPreview, MessageAttachment } from "@/types/network";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

interface UseMessagingOptions {
  initialConversationId?: string;
  pollIntervalMs?: number;
}

export function useMessaging(options: UseMessagingOptions = {}) {
  const { initialConversationId = "", pollIntervalMs = 4000 } = options;
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeId, setActiveId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePresenceHeartbeat(true);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/messages/conversations", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations ?? []);
    return data.conversations as ConversationPreview[];
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    const res = await fetch(`/api/messages/${conversationId}`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const list = await loadConversations();
      if (initialConversationId) {
        setActiveId(initialConversationId);
      } else if (!activeId && list?.[0]?.id) {
        setActiveId(list[0].id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    pollRef.current = setInterval(() => {
      void loadMessages(activeId);
      void loadConversations();
    }, pollIntervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadConversations, loadMessages, pollIntervalMs]);

  const sendMessage = useCallback(
    async (content: string, file?: MessageAttachment) => {
      if (!activeId) return false;

      const res = await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, file }),
      });
      const data = await res.json();
      if (!res.ok) return false;

      setMessages((prev) => [...prev, data.message as ChatMessage]);
      void loadConversations();
      return true;
    },
    [activeId, loadConversations]
  );

  const startConversation = useCallback(
    async (targetAccountId: string) => {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetAccountId }),
      });
      const data = await res.json();
      if (!res.ok) return null;

      await loadConversations();
      const conversationId = data.conversation?.id as string | undefined;
      if (conversationId) setActiveId(conversationId);
      return conversationId ?? null;
    },
    [loadConversations]
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const activeConversation = conversations.find((c) => c.id === activeId);

  return {
    conversations,
    activeId,
    setActiveId,
    activeConversation,
    messages,
    loading,
    sendMessage,
    startConversation,
    loadConversations,
    totalUnread,
  };
}
