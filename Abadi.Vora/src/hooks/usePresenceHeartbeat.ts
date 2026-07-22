"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 30_000;

export function usePresenceHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      void fetch("/api/presence", { method: "POST", credentials: "include" });
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}
