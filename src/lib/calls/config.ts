/** Rollback: set NEXT_PUBLIC_ENABLE_VIDEO_CALLS=false (or unset) — UI and WebRTC code stay inert. */
export function isVideoCallsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_VIDEO_CALLS === "true";
}

/** Free public STUN — no paid TURN/API. Some NATs may fail without TURN. */
export function getDefaultIceServers(): RTCIceServer[] {
  return [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
}

export type CallContextType = "network" | "freelance";

export function buildCallChannelId(context: CallContextType, contextId: string): string {
  return `vora-call:${context}:${contextId}`;
}
