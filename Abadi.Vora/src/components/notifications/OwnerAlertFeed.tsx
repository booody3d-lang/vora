"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DEMO_OWNER_ALERTS } from "@/lib/notifications/mock-data";
import { subscribeNotifications } from "@/lib/notifications/engine";
import type { OwnerAlert } from "@/types/notifications";
import { formatSar } from "@/lib/billing/engine";

export function OwnerAlertFeed() {
  const [alerts, setAlerts] = useState(DEMO_OWNER_ALERTS);

  useEffect(() => {
    return subscribeNotifications((n) => {
      if (n.isCritical || n.category === "financial" || n.category === "security") {
        setAlerts((prev) => [n as OwnerAlert, ...prev]);
      }
    });
  }, []);

  const unread = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5">
      <div className="flex items-center justify-between border-b border-red-500/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <h3 className="text-sm font-bold text-red-400">Owner Live Alerts</h3>
          {unread > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
        <Link href="/admin/security" className="text-xs text-slate-400 hover:text-white">
          View all →
        </Link>
      </div>
      <ul className="max-h-64 overflow-y-auto divide-y divide-red-500/10">
        {alerts.slice(0, 8).map((alert) => (
          <li key={alert.id}>
            <Link
              href={alert.href ?? "/admin"}
              className={`block px-5 py-3 transition-colors hover:bg-red-500/10 ${!alert.isRead ? "bg-red-500/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{alert.body}</p>
                </div>
                {alert.amountSar && (
                  <span className="shrink-0 text-sm font-bold text-emerald-400">
                    {formatSar(alert.amountSar)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                {new Date(alert.createdAt).toLocaleString("en-SA")} · {alert.channels.join(", ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
