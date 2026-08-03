import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type CallSignalPayload =
  | { type: "invite"; callId: string; from: string; mode: "video" | "audio" }
  | { type: "accept"; callId: string; from: string }
  | { type: "reject"; callId: string; from: string }
  | { type: "end"; callId: string; from: string }
  | { type: "offer"; callId: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; callId: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; callId: string; from: string; candidate: RTCIceCandidateInit };

const SIGNAL_EVENT = "webrtc-signal";

export function subscribeCallSignals(
  channelId: string,
  localAccountId: string,
  onSignal: (payload: CallSignalPayload) => void
): RealtimeChannel | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient();
  const channel = supabase
    .channel(channelId, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: SIGNAL_EVENT }, ({ payload }) => {
      const msg = payload as CallSignalPayload;
      if (!msg?.from || msg.from === localAccountId) return;
      onSignal(msg);
    })
    .subscribe();

  return channel;
}

export async function sendCallSignal(
  channel: RealtimeChannel | null,
  payload: CallSignalPayload
): Promise<void> {
  if (!channel) return;
  await channel.send({ type: "broadcast", event: SIGNAL_EVENT, payload });
}

export function unsubscribeCallSignals(channel: RealtimeChannel | null): void {
  if (!channel) return;
  const supabase = createClient();
  void supabase.removeChannel(channel);
}
