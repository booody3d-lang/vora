/** Set NEXT_PUBLIC_ENABLE_VIDEO_CALLS=false to disable call UI and camera/mic permissions. */
export function isVideoCallsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_VIDEO_CALLS;
  if (flag === "false" || flag === "0") return false;
  // Enabled by default so Production shows call controls without a separate Vercel flag.
  return true;
}

/** Free public STUN — no paid TURN/API. Some NATs may fail without TURN. */
export function getDefaultIceServers(): RTCIceServer[] {
  return [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
}

export type CallContextType = "network" | "freelance";

export function buildCallChannelId(context: CallContextType, contextId: string): string {
  return `vora-call:${context}:${contextId}`;
}
