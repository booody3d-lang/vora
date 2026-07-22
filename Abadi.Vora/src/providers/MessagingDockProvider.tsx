"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface MessagingDockContextValue {
  isOpen: boolean;
  isMinimized: boolean;
  activeConversationId: string;
  openDock: (conversationId?: string) => void;
  closeDock: () => void;
  toggleMinimize: () => void;
  setActiveConversationId: (id: string) => void;
}

const defaultDockValue: MessagingDockContextValue = {
  isOpen: false,
  isMinimized: false,
  activeConversationId: "",
  openDock: () => {},
  closeDock: () => {},
  toggleMinimize: () => {},
  setActiveConversationId: () => {},
};

const MessagingDockCtx = createContext<MessagingDockContextValue>(defaultDockValue);

export function MessagingDockProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState("");

  const openDock = useCallback((conversationId?: string) => {
    if (conversationId) setActiveConversationId(conversationId);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeDock = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((value) => !value);
  }, []);

  const value = useMemo<MessagingDockContextValue>(
    () => ({
      isOpen,
      isMinimized,
      activeConversationId,
      openDock,
      closeDock,
      toggleMinimize,
      setActiveConversationId,
    }),
    [isOpen, isMinimized, activeConversationId, openDock, closeDock, toggleMinimize]
  );

  return <MessagingDockCtx.Provider value={value}>{children}</MessagingDockCtx.Provider>;
}

export function useMessagingDock(): MessagingDockContextValue {
  return useContext(MessagingDockCtx) ?? defaultDockValue;
}
