"use client";

/**
 * Legacy hook — call state now lives in CallProvider.
 * Kept as a thin re-export for any remaining imports.
 */
export type { CallMode, CallStatus } from "@/providers/CallProvider";
export { useCall as useVideoCall } from "@/providers/CallProvider";
