"use client";

import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  isOnline?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function PresenceIndicator({
  isOnline = false,
  className,
  size = "md",
}: PresenceIndicatorProps) {
  const sizeClass = size === "sm" ? "h-2.5 w-2.5 border" : "h-3 w-3 border-2";

  return (
    <span
      className={cn(
        "absolute rounded-full border-white",
        sizeClass,
        isOnline ? "bg-emerald-500" : "bg-slate-400",
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
}
