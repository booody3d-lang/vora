import type { RealtimeChannel } from "@supabase/supabase-js";

import type { CallContextType } from "@/lib/calls/config";
import { createClient } from "@/lib/supabase/client";

export type CallSignalPayload =
  | {
      type: "invite";
      callId: string;
      from: string;
      fromName?: string;
      mode: "video" | "audio";
      contextType: CallContextType;
      contextId: string;
    }
  | { type: "accept"; callId: string; from: string }
  | {
      type: "reject";
      callId: string;
      from: string;
      reason?: "declined" | "busy";
    }
  | {
      type: "end";
      callId: string;
      from: string;
      reason?: "hangup" | "timeout" | "failed";
      durationSec?: number;
    }
  | { type: "offer"; callId: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; callId: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; callId: string; from: string; candidate: RTCIceCandidateInit };

const SIGNAL_EVENT = "webrtc-signal";

function canUseRealtime(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function subscribeCallSignals(
  channelId: string,
  localAccountId: string,
  onSignal: (payload: CallSignalPayload) => void
): RealtimeChannel | null {
  if (!canUseRealtime()) return null;

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

/** Subscribe and wait until the channel is ready to send (or timeout). */
export async function subscribeCallSignalsReady(
  channelId: string,
  localAccountId: string,
  onSignal: (payload: CallSignalPayload) => void = () => undefined
): Promise<RealtimeChannel | null> {
  if (!canUseRealtime()) return null;

  const supabase = createClient();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (channel: RealtimeChannel | null) => {
      if (settled) return;
      settled = true;
      resolve(channel);
    };

    const channel = supabase
      .channel(channelId, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: SIGNAL_EVENT }, ({ payload }) => {
        const msg = payload as CallSignalPayload;
        if (!msg?.from || msg.from === localAccountId) return;
        onSignal(msg);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") finish(channel);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish(null);
      });

    window.setTimeout(() => finish(channel), 2500);
  });
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
