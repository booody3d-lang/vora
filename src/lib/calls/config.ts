/** Set NEXT_PUBLIC_ENABLE_VIDEO_CALLS=false to disable call UI and camera/mic permissions. */
export function isVideoCallsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_VIDEO_CALLS;
  if (flag === "false" || flag === "0") return false;
  return true;
}

/**
 * STUN + public TURN (Open Relay) for symmetric NATs.
 * TURN improves reconnect / one-way-media reliability vs STUN-only.
 */
export function getDefaultIceServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];
}

export type CallContextType = "network" | "freelance";

export function buildCallChannelId(context: CallContextType, contextId: string): string {
  return `vora-call:${context}:${contextId}`;
}
