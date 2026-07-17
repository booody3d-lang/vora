"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/providers/NotificationProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  variant?: "light" | "dark";
}

export function NotificationBell({ variant = "dark" }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const iconColor = variant === "light" ? "text-white" : "text-slate-600";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn("relative rounded-lg p-2 transition-colors hover:bg-white/10", iconColor)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-[#0F172A]">
              {isAr ? "الإشعارات" : "Notifications"}
            </h3>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-[#3B5998] hover:underline">
                {isAr ? "قراءة الكل" : "Mark all read"}
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                {isAr ? "لا إشعارات" : "No notifications"}
              </li>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href ?? "#"}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className={cn(
                      "block px-4 py-3 transition-colors hover:bg-slate-50",
                      !n.isRead && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#3B5998]" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {isAr && n.titleAr ? n.titleAr : n.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {isAr && n.bodyAr ? n.bodyAr : n.body}
                        </p>
                        {n.amountSar && (
                          <p className="mt-0.5 text-xs font-semibold text-[#EA580C]">
                            SR {n.amountSar.toLocaleString("en-SA")}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString(isAr ? "ar-SA" : "en-SA")}
                        </p>
                      </div>
                      {n.isCritical && (
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                          !
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/network/settings/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-[#3B5998] hover:bg-slate-50"
          >
            {isAr ? "إعدادات الإشعارات" : "Notification Settings →"}
          </Link>
        </div>
      )}
    </div>
  );
}
