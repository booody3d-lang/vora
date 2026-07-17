"use client";

import { useState } from "react";
import type { ConnectionStatus } from "@/types/network";
import { cn } from "@/lib/utils";

interface ConnectButtonProps {
  targetUserId: string;
  targetName: string;
  initialStatus?: ConnectionStatus;
}

export function ConnectButton({
  targetUserId,
  targetName,
  initialStatus,
}: ConnectButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus | "none">(
    initialStatus ?? "none"
  );

  function handleConnect() {
    setStatus("pending");
    // Will wire to Supabase connections table
    console.info(`Connection request sent to ${targetUserId}`);
  }

  if (status === "accepted") {
    return (
      <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        ✓ Connected
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
        Pending
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      className={cn(
        "rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      )}
      title={`Connect with ${targetName}`}
    >
      Connect
    </button>
  );
}
