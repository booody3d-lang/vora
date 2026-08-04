"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { MeetingRoom } from "@/components/calls/MeetingRoom";
import {
  buildCallChannelId,
  getDefaultIceServers,
  isVideoCallsEnabled,
  type CallContextType,
} from "@/lib/calls/config";
import { encodeCallEvent, type CallEventKind, type CallEventMode } from "@/lib/calls/call-events";
import { playCallTone, stopCallSounds } from "@/lib/calls/call-sounds";
import {
  sendCallSignal,
  subscribeCallSignals,
  subscribeCallSignalsReady,
  unsubscribeCallSignals,
  type CallSignalPayload,
} from "@/lib/calls/signaling";
import { usePermissions } from "@/providers/VoraProviders";

export type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "in-call"
  | "summary"
  | "error";

export type CallMode = CallEventMode;

export interface CallSummary {
  peerLabel: string;
  mode: CallMode;
  kind: CallEventKind;
  durationSec: number;
}

interface StartCallArgs {
  contextType: CallContextType;
  contextId: string;
  peerAccountId: string;
  peerLabel: string;
  mode: CallMode;
  fromName?: string;
}

interface CallContextValue {
  status: CallStatus;
  mode: CallMode;
  error: string | null;
  peerLabel: string;
  peerAccountId: string;
  contextId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  durationSec: number;
  summary: CallSummary | null;
  isActive: boolean;
  startCall: (args: StartCallArgs) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  dismissSummary: () => void;
  registerConversation: (conversationId: string) => void;
}

const CallContext = createContext<CallContextValue | null>(null);
const RING_TIMEOUT_MS = 45_000;

function newCallId(): string {
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function postCallChatEvent(
  conversationId: string,
  kind: CallEventKind,
  mode: CallMode,
  durationSec = 0
) {
  if (!conversationId) return;
  try {
    await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: encodeCallEvent({ kind, mode, durationSec }),
      }),
    });
  } catch {
    // best-effort
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, role } = usePermissions();
  const localAccountId = user?.id ?? "";
  const enabled = isVideoCallsEnabled() && role !== "company" && Boolean(localAccountId);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [mode, setMode] = useState<CallMode>("video");
  const [error, setError] = useState<string | null>(null);
  const [peerLabel, setPeerLabel] = useState("");
  const [peerAccountId, setPeerAccountId] = useState("");
  const [contextType, setContextType] = useState<CallContextType>("network");
  const [contextId, setContextId] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [summary, setSummary] = useState<CallSummary | null>(null);

  const statusRef = useRef<CallStatus>("idle");
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteAnswerAppliedRef = useRef(false);
  const acceptingRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaChannelRef = useRef<RealtimeChannel | null>(null);
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const contextIdRef = useRef("");
  const contextTypeRef = useRef<CallContextType>("network");
  const modeRef = useRef<CallMode>("video");
  const peerLabelRef = useRef("");
  const peerAccountIdRef = useRef("");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    contextIdRef.current = contextId;
  }, [contextId]);
  useEffect(() => {
    contextTypeRef.current = contextType;
  }, [contextType]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    peerLabelRef.current = peerLabel;
  }, [peerLabel]);
  useEffect(() => {
    peerAccountIdRef.current = peerAccountId;
  }, [peerAccountId]);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const remoteMediaRef = useRef<MediaStream>(new MediaStream());

  const stopMediaTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteMediaRef.current.getTracks().forEach((t) => {
      try {
        remoteMediaRef.current.removeTrack(t);
        t.stop();
      } catch {
        // ignore
      }
    });
    remoteMediaRef.current = new MediaStream();
    setLocalStream(null);
    setRemoteStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    pendingIceRef.current = [];
    remoteAnswerAppliedRef.current = false;
    acceptingRef.current = false;
  }, []);

  const publishRemoteStream = useCallback(() => {
    // New MediaStream wrapper so React consumers re-bind reliably on reconnect.
    setRemoteStream(new MediaStream(remoteMediaRef.current.getTracks()));
  }, []);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream, onIce: (candidate: RTCIceCandidateInit) => void) => {
      const pc = new RTCPeerConnection({
        iceServers: getDefaultIceServers(),
        iceCandidatePoolSize: 4,
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const addTrack = (track: MediaStreamTrack) => {
          const already = remoteMediaRef.current.getTracks().some((t) => t.id === track.id);
          if (!already) remoteMediaRef.current.addTrack(track);
          track.addEventListener("unmute", () => publishRemoteStream());
          track.addEventListener("ended", () => publishRemoteStream());
        };

        if (event.streams?.[0]) {
          event.streams[0].getTracks().forEach(addTrack);
        } else {
          addTrack(event.track);
        }
        publishRemoteStream();
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "failed") {
          try {
            pc.restartIce();
          } catch {
            // ignore
          }
        }
        if (state === "connected" || state === "completed") {
          publishRemoteStream();
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) onIce(event.candidate.toJSON());
      };

      pcRef.current = pc;
      return pc;
    },
    [publishRemoteStream]
  );

  const beginConnected = useCallback(() => {
    if (statusRef.current === "in-call" && connectedAtRef.current) return;
    clearRingTimer();
    stopCallSounds();
    if (!connectedAtRef.current) connectedAtRef.current = Date.now();
    clearDurationTimer();
    durationTimerRef.current = setInterval(() => {
      if (!connectedAtRef.current) return;
      setDurationSec(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 1000);
    setError(null);
    setStatus("in-call");
  }, [clearDurationTimer, clearRingTimer]);

  const showSummary = useCallback((kind: CallEventKind, dur: number) => {
    setSummary({
      peerLabel: peerLabelRef.current,
      mode: modeRef.current,
      kind,
      durationSec: dur,
    });
    setStatus("summary");
  }, []);

  const resetToIdle = useCallback(() => {
    clearRingTimer();
    clearDurationTimer();
    stopCallSounds();
    stopMediaTracks();
    callIdRef.current = null;
    isCallerRef.current = false;
    pendingOfferRef.current = null;
    connectedAtRef.current = null;
    setDurationSec(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setError(null);
    setStatus("idle");
  }, [clearDurationTimer, clearRingTimer, stopMediaTracks]);

  const applyRemoteAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      const pc = pcRef.current;
      if (!pc || !isCallerRef.current) return;
      if (remoteAnswerAppliedRef.current) {
        beginConnected();
        return;
      }
      const stateBefore = pc.signalingState as RTCSignalingState;
      if (stateBefore !== "have-local-offer") {
        // Already stable / answered — just enter in-call.
        beginConnected();
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        remoteAnswerAppliedRef.current = true;
        await flushIce();
        beginConnected();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Call failed";
        const stateAfter = pc.signalingState as RTCSignalingState;
        // Duplicate answer is common with dual-channel delivery.
        if (
          remoteAnswerAppliedRef.current ||
          stateAfter === "stable" ||
          /wrong state:\s*stable/i.test(message)
        ) {
          remoteAnswerAppliedRef.current = true;
          beginConnected();
          return;
        }
        setError(message);
        setStatus("error");
      }
    },
    [beginConnected, flushIce]
  );

  const finishCall = useCallback(
    async (kind: CallEventKind, notifyPeer: boolean) => {
      const callId = callIdRef.current;
      const dur =
        connectedAtRef.current != null
          ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
          : 0;
      const conversationId = contextIdRef.current;
      const callMode = modeRef.current;

      if (notifyPeer && callId) {
        const payload: CallSignalPayload = {
          type: "end",
          callId,
          from: localAccountId,
          reason: kind === "missed" ? "timeout" : "hangup",
          durationSec: dur,
        };
        await sendCallSignal(mediaChannelRef.current, payload);
        if (peerAccountIdRef.current) {
          const ch = await subscribeCallSignalsReady(
            `vora-call:user:${peerAccountIdRef.current}`,
            localAccountId
          );
          await sendCallSignal(ch, payload);
          unsubscribeCallSignals(ch);
        }
      }

      clearRingTimer();
      clearDurationTimer();
      stopCallSounds();
      playCallTone("end");
      stopMediaTracks();

      if (conversationId) {
        await postCallChatEvent(conversationId, kind, callMode, dur);
      }

      callIdRef.current = null;
      isCallerRef.current = false;
      pendingOfferRef.current = null;
      connectedAtRef.current = null;
      showSummary(kind, dur);
    },
    [clearDurationTimer, clearRingTimer, localAccountId, showSummary, stopMediaTracks]
  );

  const attachMediaChannel = useCallback(
    async (type: CallContextType, id: string) => {
      const channelId = buildCallChannelId(type, id);
      const existing = conversationChannelsRef.current.get(id);
      if (existing && existing.state === "joined") {
        mediaChannelRef.current = existing;
        return existing;
      }
      if (existing) {
        unsubscribeCallSignals(existing);
        conversationChannelsRef.current.delete(id);
      }

      const channel = await subscribeCallSignalsReady(channelId, localAccountId, (msg) => {
        void handleSignalRef.current(msg);
      });
      if (channel) {
        conversationChannelsRef.current.set(id, channel);
        mediaChannelRef.current = channel;
      }
      return channel;
    },
    [localAccountId]
  );

  const handleSignalRef = useRef<(msg: CallSignalPayload) => Promise<void>>(async () => undefined);

  const handleSignal = useCallback(
    async (msg: CallSignalPayload) => {
      const phase = statusRef.current;
      const activeCallId = callIdRef.current;

      if (msg.type === "invite") {
        if (phase !== "idle" && phase !== "summary") return;

        callIdRef.current = msg.callId;
        isCallerRef.current = false;
        remoteAnswerAppliedRef.current = false;
        pendingOfferRef.current = msg.sdp ?? null;
        remoteMediaRef.current = new MediaStream();
        setRemoteStream(null);
        setMode(msg.mode);
        setPeerLabel(msg.fromName || "User");
        setPeerAccountId(msg.from);
        setContextType(msg.contextType ?? "network");
        setContextId(msg.contextId);
        setError(null);
        setStatus("ringing");
        playCallTone("incoming");

        await attachMediaChannel(msg.contextType ?? "network", msg.contextId);

        clearRingTimer();
        ringTimerRef.current = setTimeout(() => {
          if (statusRef.current === "ringing") void finishCall("missed", true);
        }, RING_TIMEOUT_MS);
        return;
      }

      if (msg.type === "offer") {
        if (!isCallerRef.current) {
          if (!callIdRef.current) callIdRef.current = msg.callId;
          if (!activeCallId || msg.callId === callIdRef.current || statusRef.current === "ringing") {
            pendingOfferRef.current = msg.sdp;
          }
        }
        return;
      }

      if (msg.type === "answer") {
        if (!isCallerRef.current) return;
        if (activeCallId && msg.callId !== activeCallId) return;
        await applyRemoteAnswer(msg.sdp);
        return;
      }

      if (!activeCallId || msg.callId !== activeCallId) {
        // Allow ICE for the active call only
        if (msg.type === "ice" && callIdRef.current && msg.callId === callIdRef.current) {
          // fall through below after re-check
        } else if (msg.type !== "ice") {
          return;
        } else {
          return;
        }
      }

      if (msg.type === "reject") {
        clearRingTimer();
        stopCallSounds();
        playCallTone("end");
        stopMediaTracks();
        callIdRef.current = null;
        showSummary(msg.reason === "busy" ? "failed" : "declined", 0);
        return;
      }

      if (msg.type === "end") {
        const dur =
          typeof msg.durationSec === "number"
            ? msg.durationSec
            : connectedAtRef.current != null
              ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
              : 0;
        clearRingTimer();
        clearDurationTimer();
        stopCallSounds();
        playCallTone("end");
        stopMediaTracks();
        const kind: CallEventKind =
          statusRef.current === "ringing" || statusRef.current === "calling" ? "missed" : "ended";
        callIdRef.current = null;
        showSummary(kind, dur);
        return;
      }

      if (msg.type === "accept" && isCallerRef.current) {
        // Soft ack only — connection completes when answer SDP is applied.
        if (remoteAnswerAppliedRef.current) beginConnected();
        return;
      }

      if (msg.type === "ice") {
        const pc = pcRef.current;
        if (!pc) {
          pendingIceRef.current.push(msg.candidate);
          return;
        }
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(msg.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          // ignore
        }
      }
    },
    [
      applyRemoteAnswer,
      attachMediaChannel,
      beginConnected,
      clearDurationTimer,
      clearRingTimer,
      finishCall,
      showSummary,
      stopMediaTracks,
    ]
  );

  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  useEffect(() => {
    if (!enabled || !localAccountId) return;
    let cancelled = false;

    void (async () => {
      const channel = await subscribeCallSignalsReady(
        `vora-call:user:${localAccountId}`,
        localAccountId,
        (payload) => {
          void handleSignalRef.current(payload);
        }
      );
      if (cancelled) {
        unsubscribeCallSignals(channel);
        return;
      }
      userChannelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      unsubscribeCallSignals(userChannelRef.current);
      userChannelRef.current = null;
    };
  }, [enabled, localAccountId]);

  const registerConversation = useCallback(
    (conversationId: string) => {
      if (!enabled || !localAccountId || !conversationId) return;
      if (conversationChannelsRef.current.has(conversationId)) return;

      const channel = subscribeCallSignals(
        buildCallChannelId("network", conversationId),
        localAccountId,
        (payload) => {
          void handleSignalRef.current(payload);
        }
      );
      if (channel) conversationChannelsRef.current.set(conversationId, channel);
    },
    [enabled, localAccountId]
  );

  useEffect(() => {
    if (!enabled || !localAccountId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/messages/conversations", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        for (const item of (data.conversations ?? []) as Array<{ id?: string }>) {
          if (item.id) registerConversation(item.id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
      for (const channel of conversationChannelsRef.current.values()) {
        unsubscribeCallSignals(channel);
      }
      conversationChannelsRef.current.clear();
    };
  }, [enabled, localAccountId, registerConversation]);

  const startCall = useCallback(
    async (args: StartCallArgs) => {
      if (!enabled) return;
      if (statusRef.current !== "idle" && statusRef.current !== "summary") return;

      setSummary(null);
      setError(null);
      setMode(args.mode);
      setPeerLabel(args.peerLabel);
      setPeerAccountId(args.peerAccountId);
      setContextType(args.contextType);
      setContextId(args.contextId);
      registerConversation(args.contextId);

      try {
        // Ensure previous call media is fully released before re-connecting.
        stopMediaTracks();
        remoteMediaRef.current = new MediaStream();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            args.mode === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }
              : false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMuted(false);
        setIsCameraOff(false);

        const callId = newCallId();
        callIdRef.current = callId;
        isCallerRef.current = true;
        remoteAnswerAppliedRef.current = false;
        pendingIceRef.current = [];
        connectedAtRef.current = null;
        setDurationSec(0);

        const mediaChannel = await attachMediaChannel(args.contextType, args.contextId);

        const pc = createPeerConnection(stream, (candidate) => {
          // ICE only on the shared media channel — never open a new Realtime channel per candidate.
          void sendCallSignal(mediaChannelRef.current ?? mediaChannel, {
            type: "ice",
            callId,
            from: localAccountId,
            candidate,
          });
        });

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: args.mode === "video",
        });
        await pc.setLocalDescription(offer);
        const localOffer = pc.localDescription ?? offer;

        setStatus("calling");
        playCallTone("ringback");

        // Invite carries the offer SDP — callee can answer without a separate offer race.
        const peerInviteChannel = await subscribeCallSignalsReady(
          `vora-call:user:${args.peerAccountId}`,
          localAccountId
        );
        await sendCallSignal(peerInviteChannel, {
          type: "invite",
          callId,
          from: localAccountId,
          fromName: args.fromName || user?.email?.split("@")[0] || "User",
          mode: args.mode,
          contextType: args.contextType,
          contextId: args.contextId,
          sdp: localOffer,
        });
        unsubscribeCallSignals(peerInviteChannel);

        // Also publish on media channel for ICE / redundancy
        await sendCallSignal(mediaChannelRef.current ?? mediaChannel, {
          type: "offer",
          callId,
          from: localAccountId,
          sdp: localOffer,
        });

        clearRingTimer();
        ringTimerRef.current = setTimeout(() => {
          if (statusRef.current === "calling") void finishCall("missed", true);
        }, RING_TIMEOUT_MS);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not access camera/microphone");
        setStatus("error");
        stopMediaTracks();
      }
    },
    [
      attachMediaChannel,
      clearRingTimer,
      createPeerConnection,
      enabled,
      finishCall,
      localAccountId,
      registerConversation,
      stopMediaTracks,
      user?.email,
    ]
  );

  const acceptCall = useCallback(async () => {
    if (acceptingRef.current) return;
    const activeCallId = callIdRef.current;
    if (statusRef.current !== "ringing" || !activeCallId || !contextIdRef.current) return;

    acceptingRef.current = true;
    stopCallSounds();
    clearRingTimer();
    setError(null);

    try {
      // Invite embeds SDP — only wait briefly if it has not been stored yet.
      let sdp = pendingOfferRef.current;
      for (let i = 0; i < 8 && !sdp; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
        sdp = pendingOfferRef.current;
      }
      if (!sdp) {
        setError("تعذر استلام إشارة الاتصال — أعد المحاولة");
        setStatus("error");
        return;
      }

      const mediaChannelPromise = attachMediaChannel(
        contextTypeRef.current,
        contextIdRef.current
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: modeRef.current === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const mediaChannel = await mediaChannelPromise;

      pcRef.current?.close();
      pcRef.current = null;
      pendingIceRef.current = [];
      remoteMediaRef.current = new MediaStream();
      setRemoteStream(null);

      const pc = createPeerConnection(stream, (candidate) => {
        void sendCallSignal(mediaChannelRef.current ?? mediaChannel, {
          type: "ice",
          callId: activeCallId,
          from: localAccountId,
          candidate,
        });
      });

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const localAnswer = pc.localDescription ?? answer;

      // Enter in-call immediately for responsive UI; signaling continues in parallel.
      pendingOfferRef.current = null;
      beginConnected();
      void postCallChatEvent(contextIdRef.current, "started", modeRef.current, 0);

      await sendCallSignal(mediaChannelRef.current ?? mediaChannel, {
        type: "answer",
        callId: activeCallId,
        from: localAccountId,
        sdp: localAnswer,
      });
      await sendCallSignal(mediaChannelRef.current ?? mediaChannel, {
        type: "accept",
        callId: activeCallId,
        from: localAccountId,
      });

      // Backup delivery on caller's personal channel (once — not per ICE).
      if (peerAccountIdRef.current) {
        const callerChannel = await subscribeCallSignalsReady(
          `vora-call:user:${peerAccountIdRef.current}`,
          localAccountId
        );
        await sendCallSignal(callerChannel, {
          type: "answer",
          callId: activeCallId,
          from: localAccountId,
          sdp: localAnswer,
        });
        await sendCallSignal(callerChannel, {
          type: "accept",
          callId: activeCallId,
          from: localAccountId,
        });
        unsubscribeCallSignals(callerChannel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer call");
      setStatus("error");
      stopMediaTracks();
    } finally {
      acceptingRef.current = false;
    }
  }, [
    attachMediaChannel,
    beginConnected,
    clearRingTimer,
    createPeerConnection,
    flushIce,
    localAccountId,
    stopMediaTracks,
  ]);

  const rejectCall = useCallback(async () => {
    const callId = callIdRef.current;
    const payload: CallSignalPayload | null = callId
      ? { type: "reject", callId, from: localAccountId, reason: "declined" }
      : null;

    if (payload) {
      await sendCallSignal(mediaChannelRef.current, payload);
      if (peerAccountIdRef.current) {
        const ch = await subscribeCallSignalsReady(
          `vora-call:user:${peerAccountIdRef.current}`,
          localAccountId
        );
        await sendCallSignal(ch, payload);
        unsubscribeCallSignals(ch);
      }
    }

    clearRingTimer();
    stopCallSounds();
    playCallTone("end");
    stopMediaTracks();
    await postCallChatEvent(contextIdRef.current, "declined", modeRef.current, 0);
    callIdRef.current = null;
    showSummary("declined", 0);
  }, [clearRingTimer, localAccountId, showSummary, stopMediaTracks]);

  const endCall = useCallback(async () => {
    if (statusRef.current === "calling") {
      await finishCall("cancelled", true);
      return;
    }
    if (statusRef.current === "ringing") {
      await rejectCall();
      return;
    }
    if (statusRef.current === "error") {
      resetToIdle();
      return;
    }
    await finishCall("ended", true);
  }, [finishCall, rejectCall, resetToIdle]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((v) => !v);
  }, []);

  const dismissSummary = useCallback(() => {
    setSummary(null);
    resetToIdle();
  }, [resetToIdle]);

  useEffect(() => {
    return () => {
      clearRingTimer();
      clearDurationTimer();
      stopCallSounds();
      stopMediaTracks();
      unsubscribeCallSignals(userChannelRef.current);
    };
  }, [clearDurationTimer, clearRingTimer, stopMediaTracks]);

  const value = useMemo<CallContextValue>(
    () => ({
      status,
      mode,
      error,
      peerLabel,
      peerAccountId,
      contextId,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      durationSec,
      summary,
      isActive: status === "calling" || status === "ringing" || status === "in-call",
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      dismissSummary,
      registerConversation,
    }),
    [
      acceptCall,
      contextId,
      dismissSummary,
      durationSec,
      endCall,
      error,
      isCameraOff,
      isMuted,
      localStream,
      mode,
      peerAccountId,
      peerLabel,
      registerConversation,
      rejectCall,
      remoteStream,
      startCall,
      status,
      summary,
      toggleCamera,
      toggleMute,
    ]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {enabled && (
        <MeetingRoom
          open={
            status === "calling" ||
            status === "ringing" ||
            status === "in-call" ||
            status === "summary" ||
            status === "error"
          }
          status={status}
          mode={mode}
          peerLabel={peerLabel}
          error={error}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          durationSec={durationSec}
          summary={summary}
          onAccept={() => void acceptCall()}
          onReject={() => void rejectCall()}
          onEnd={() => void endCall()}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onDismissSummary={dismissSummary}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function useCallOptional(): CallContextValue | null {
  return useContext(CallContext);
}
