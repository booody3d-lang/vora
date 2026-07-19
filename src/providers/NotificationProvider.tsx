"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NotificationPayload, NotificationPreferences } from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";
import { subscribeNotifications } from "@/lib/notifications/engine";
import { createClient } from "@/lib/supabase/client";

interface NotificationContextValue {
  notifications: NotificationPayload[];
  unreadCount: number;
  preferences: NotificationPreferences;
  markRead: (id: string) => void;
  markAllRead: () => void;
  updatePreferences: (prefs: NotificationPreferences) => void;
  pushNotification: (n: NotificationPayload) => void;
}

const NotificationCtx = createContext<NotificationContextValue | null>(null);

const PREFS_KEY = "vora_notification_prefs";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_NOTIFICATION_PREFERENCES;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    return subscribeNotifications((n) => {
      setNotifications((prev) => [n, ...prev]);
    });
  }, []);

  // Supabase Realtime for live notifications
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("notifications:live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const n: NotificationPayload = {
              id: String(row.id),
              trigger: row.trigger_type as NotificationPayload["trigger"],
              category: row.category as NotificationPayload["category"],
              title: String(row.title),
              body: String(row.body),
              href: row.href ? String(row.href) : undefined,
              amountSar: row.amount_sar ? Number(row.amount_sar) : undefined,
              isRead: false,
              isCritical: Boolean(row.is_critical),
              createdAt: String(row.created_at),
              channels: (row.channels as NotificationPayload["channels"]) ?? ["in_app"],
            };
            setNotifications((prev) => [n, ...prev]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } catch {
      // Demo mode
    }
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const updatePreferences = useCallback((prefs: NotificationPreferences) => {
    setPreferences(prefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, []);

  const pushNotification = useCallback((n: NotificationPayload) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, preferences, markRead, markAllRead, updatePreferences, pushNotification }),
    [notifications, unreadCount, preferences, markRead, markAllRead, updatePreferences, pushNotification]
  );

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationCtx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
