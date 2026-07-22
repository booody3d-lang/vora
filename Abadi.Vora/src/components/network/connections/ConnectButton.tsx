"use client";

import { useState } from "react";
import type { ConnectionStatus } from "@/types/network";
import { useTranslations } from "@/i18n/use-translations";
import { useGuardedAction } from "@/hooks/useGuardedAction";
import { cn } from "@/lib/utils";

interface ConnectButtonProps {
  targetUserId: string;
  targetName: string;
  initialStatus?: ConnectionStatus;
  hasIncomingPending?: boolean;
}

export function ConnectButton({
  targetUserId,
  targetName,
  initialStatus,
  hasIncomingPending = false,
}: ConnectButtonProps) {
  const { t } = useTranslations();
  const [status, setStatus] = useState<ConnectionStatus | "none">(initialStatus ?? "none");
  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({
    action: "follow_connect",
    onAllowed: async () => {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasIncomingPending
            ? { action: "accept", followerAccountId: targetUserId }
            : { action: "request", targetId: targetUserId }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      setStatus(data.isAccepted ? "accepted" : "pending");
    },
  });

  function handleConnect() {
    execute();
  }

  if (status === "accepted") {
    return (
      <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        ✓ {t("network.connections.connected")}
      </span>
    );
  }

  if (status === "pending") {
    return (
      <button
        type="button"
        disabled
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
      >
        {t("network.connections.pending")}
      </button>
    );
  }

  return (
    <>
      {VisitorModal}
      <button
        type="button"
        onClick={handleConnect}
        className={cn(
          "rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        )}
        title={t("network.connections.connectWith", { name: targetName })}
      >
        {hasIncomingPending
          ? t("network.connections.accept")
          : t("network.connections.connect")}
      </button>
      {restrictionMessage && (
        <p className="mt-1 text-xs text-amber-600">{restrictionMessage}</p>
      )}
    </>
  );
}
