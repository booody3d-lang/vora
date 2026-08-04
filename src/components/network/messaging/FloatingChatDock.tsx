"use client";

import { useEffect, useState } from "react";
import { NavRouteLink } from "@/components/navigation/NavRouteLink";
import { usePathname } from "next/navigation";
import { MessagingShell } from "@/components/network/messaging/MessagingShell";
import { useMessaging } from "@/hooks/useMessaging";
import { useMessagingDock } from "@/providers/MessagingDockProvider";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

export function FloatingChatDock() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  const {
    isOpen,
    isMinimized,
    activeConversationId,
    openDock,
    closeDock,
    toggleMinimize,
  } = useMessagingDock();
  const { totalUnread } = useMessaging({ pollIntervalMs: 8000 });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (pathname.startsWith("/network/messages")) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 start-4 z-50 flex flex-col items-start gap-2 sm:start-auto sm:end-4 sm:items-end">
      {!isOpen && (
        <button
          type="button"
          onClick={() => openDock()}
          className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-[#3B5998] text-2xl text-white shadow-lg transition-transform hover:scale-105"
          aria-label={t("network.messages")}
        >
          💬
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all",
            isMinimized
              ? "h-14 w-72"
              : "h-[min(640px,calc(100dvh-6rem))] w-[min(440px,calc(100vw-1.5rem))]"
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-[#3B5998] px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-bold">{t("network.messages")}</p>
              {!isMinimized && (
                <p className="truncate text-[10px] text-white/80">
                  {t("network.messagingDockSubtitle")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleMinimize}
                className="rounded px-2 py-1 text-xs hover:bg-white/10"
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? "▲" : "▼"}
              </button>
              <NavRouteLink
                href="/network/messages"
                hardNavigate
                prefetch={false}
                className="rounded px-2 py-1 text-xs hover:bg-white/10"
              >
                ⤢
              </NavRouteLink>
              <button
                type="button"
                onClick={closeDock}
                className="rounded px-2 py-1 text-xs hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="min-h-0 flex-1">
              <MessagingShell
                compact
                initialConversationId={activeConversationId}
                className="h-full rounded-none border-0 shadow-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
