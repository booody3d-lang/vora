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
    // best-effort chat trail
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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaChannelRef = useRef<RealtimeChannel | null>(null);
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const contextIdRef = useRef("");
  const modeRef = useRef<CallMode>("video");
  const peerLabelRef = useRef("");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    contextIdRef.current = contextId;
  }, [contextId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    peerLabelRef.current = peerLabel;
  }, [peerLabel]);

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

  const stopMediaTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const showSummary = useCallback(
    (kind: CallEventKind, dur: number) => {
      setSummary({
        peerLabel: peerLabelRef.current,
        mode: modeRef.current,
        kind,
        durationSec: dur,
      });
      setStatus("summary");
    },
    []
  );

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

  const ensureMediaChannel = useCallback(
    (type: CallContextType, id: string, onSignal: (msg: CallSignalPayload) => void) => {
      const channelId = buildCallChannelId(type, id);
      if (mediaChannelRef.current) {
        unsubscribeCallSignals(mediaChannelRef.current);
        mediaChannelRef.current = null;
      }
      mediaChannelRef.current = subscribeCallSignals(channelId, localAccountId, onSignal);
      return mediaChannelRef.current;
    },
    [localAccountId]
  );

  const createPeerConnection = useCallback(
    (stream: MediaStream, onIce: (candidate: RTCIceCandidateInit) => void) => {
      const pc = new RTCPeerConnection({ iceServers: getDefaultIceServers() });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) setRemoteStream(remote);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) onIce(event.candidate.toJSON());
      };
      pcRef.current = pc;
      return pc;
    },
    []
  );

  const beginConnected = useCallback(() => {
    clearRingTimer();
    stopCallSounds();
    connectedAtRef.current = Date.now();
    setDurationSec(0);
    clearDurationTimer();
    durationTimerRef.current = setInterval(() => {
      if (!connectedAtRef.current) return;
      setDurationSec(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 1000);
    setStatus("in-call");
  }, [clearDurationTimer, clearRingTimer]);

  const finishCall = useCallback(
    async (kind: CallEventKind, notifyPeer: boolean) => {
      const callId = callIdRef.current;
      const dur =
        connectedAtRef.current != null
          ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
          : 0;
      const conversationId = contextIdRef.current;
      const callMode = modeRef.current;

      if (notifyPeer && callId && mediaChannelRef.current) {
        await sendCallSignal(mediaChannelRef.current, {
          type: "end",
          callId,
          from: localAccountId,
          reason: kind === "missed" ? "timeout" : "hangup",
          durationSec: dur,
        });
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

  const handleSignal = useCallback(
    async (msg: CallSignalPayload) => {
      const phase = statusRef.current;
      const activeCallId = callIdRef.current;

      if (msg.type === "invite") {
        // Never auto-answer — only ring until the user accepts.
        if (phase !== "idle" && phase !== "summary") {
          return;
        }

        callIdRef.current = msg.callId;
        isCallerRef.current = false;
        pendingOfferRef.current = null;
        setMode(msg.mode);
        setPeerLabel(msg.fromName || "User");
        setPeerAccountId(msg.from);
        setContextType(msg.contextType ?? "network");
        setContextId(msg.contextId);
        setStatus("ringing");
        playCallTone("incoming");

        ensureMediaChannel(msg.contextType ?? "network", msg.contextId, (inner) => {
          void handleSignal(inner);
        });

        clearRingTimer();
        ringTimerRef.current = setTimeout(() => {
          if (statusRef.current === "ringing") {
            void finishCall("missed", true);
          }
        }, RING_TIMEOUT_MS);
        return;
      }

      if (msg.type === "offer") {
        // Store SDP only — answering happens exclusively in acceptCall().
        if (!isCallerRef.current) {
          if (!activeCallId || msg.callId === activeCallId || statusRef.current === "ringing") {
            if (!callIdRef.current) callIdRef.current = msg.callId;
            pendingOfferRef.current = msg.sdp;
          }
        }
        return;
      }

      if (!activeCallId || msg.callId !== activeCallId) return;

      if (msg.type === "reject") {
        clearRingTimer();
        stopCallSounds();
        playCallTone("end");
        stopMediaTracks();
        const kind: CallEventKind = msg.reason === "busy" ? "failed" : "declined";
        // Peer already wrote the chat event when rejecting.
        callIdRef.current = null;
        showSummary(kind, 0);
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
          statusRef.current === "ringing" || statusRef.current === "calling"
            ? "missed"
            : "ended";
        // Peer who hung up / timed out already wrote the chat event.
        callIdRef.current = null;
        showSummary(kind, dur);
        return;
      }

      if (msg.type === "accept" && isCallerRef.current) {
        beginConnected();
        return;
      }

      if (msg.type === "answer" && isCallerRef.current && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          beginConnected();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Call failed");
          setStatus("error");
        }
        return;
      }

      if (msg.type === "ice" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          // ignore stale ICE
        }
      }
    },
    [
      beginConnected,
      clearDurationTimer,
      clearRingTimer,
      ensureMediaChannel,
      finishCall,
      localAccountId,
      showSummary,
      stopMediaTracks,
    ]
  );

  // Keep handleSignal stable for invite listener via ref
  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // Personal invite channel — rings even when the chat thread is not open
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

  // Pre-subscribe conversation media channels so offers arrive while ringing
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
        const list = (data.conversations ?? []) as Array<{ id?: string }>;
        for (const item of list) {
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: args.mode === "video",
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMuted(false);
        setIsCameraOff(false);

        const callId = newCallId();
        callIdRef.current = callId;
        isCallerRef.current = true;

        const mediaChannel = await subscribeCallSignalsReady(
          buildCallChannelId(args.contextType, args.contextId),
          localAccountId,
          (msg) => {
            void handleSignalRef.current(msg);
          }
        );
        if (mediaChannelRef.current) unsubscribeCallSignals(mediaChannelRef.current);
        mediaChannelRef.current = mediaChannel;

        const pc = createPeerConnection(stream, (candidate) => {
          void sendCallSignal(mediaChannel, {
            type: "ice",
            callId,
            from: localAccountId,
            candidate,
          });
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Ring peer on their personal channel (works even if chat is closed)
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
        });
        unsubscribeCallSignals(peerInviteChannel);

        // SDP / ICE stay on the conversation media channel
        await sendCallSignal(mediaChannel, {
          type: "offer",
          callId,
          from: localAccountId,
          sdp: offer,
        });

        setStatus("calling");
        playCallTone("ringback");

        clearRingTimer();
        ringTimerRef.current = setTimeout(() => {
          if (statusRef.current === "calling") {
            void finishCall("missed", true);
          }
        }, RING_TIMEOUT_MS);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not access camera/microphone");
        setStatus("error");
        stopMediaTracks();
      }
    },
    [
      clearRingTimer,
      createPeerConnection,
      enabled,
      ensureMediaChannel,
      finishCall,
      localAccountId,
      registerConversation,
      stopMediaTracks,
      user?.email,
    ]
  );

  const acceptCall = useCallback(async () => {
    const activeCallId = callIdRef.current;
    const offer = pendingOfferRef.current;
    if (statusRef.current !== "ringing" || !activeCallId || !contextIdRef.current) return;

    // Wait briefly if offer hasn't arrived yet
    let sdp = offer;
    if (!sdp) {
      for (let i = 0; i < 20 && !sdp; i += 1) {
        await new Promise((r) => setTimeout(r, 100));
        sdp = pendingOfferRef.current;
      }
    }
    if (!sdp) {
      setError("Call signal incomplete — try again");
      setStatus("error");
      return;
    }

    try {
      stopCallSounds();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: modeRef.current === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const mediaChannel =
        mediaChannelRef.current ??
        ensureMediaChannel(contextType, contextIdRef.current, (msg) => {
          void handleSignalRef.current(msg);
        });

      const pc = createPeerConnection(stream, (candidate) => {
        void sendCallSignal(mediaChannel, {
          type: "ice",
          callId: activeCallId,
          from: localAccountId,
          candidate,
        });
      });

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendCallSignal(mediaChannel, {
        type: "answer",
        callId: activeCallId,
        from: localAccountId,
        sdp: answer,
      });
      await sendCallSignal(mediaChannel, {
        type: "accept",
        callId: activeCallId,
        from: localAccountId,
      });

      pendingOfferRef.current = null;
      await postCallChatEvent(contextIdRef.current, "started", modeRef.current, 0);
      beginConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer call");
      setStatus("error");
      stopMediaTracks();
    }
  }, [
    beginConnected,
    contextType,
    createPeerConnection,
    ensureMediaChannel,
    localAccountId,
    stopMediaTracks,
  ]);

  const rejectCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId && mediaChannelRef.current) {
      await sendCallSignal(mediaChannelRef.current, {
        type: "reject",
        callId,
        from: localAccountId,
        reason: "declined",
      });
    }
    // Also notify via peer user channel if media channel missing
    if (callId && peerAccountId) {
      const ch = subscribeCallSignals(`vora-call:user:${peerAccountId}`, localAccountId, () => undefined);
      await sendCallSignal(ch, {
        type: "reject",
        callId,
        from: localAccountId,
        reason: "declined",
      });
      unsubscribeCallSignals(ch);
    }

    clearRingTimer();
    stopCallSounds();
    playCallTone("end");
    stopMediaTracks();
    await postCallChatEvent(contextIdRef.current, "declined", modeRef.current, 0);
    callIdRef.current = null;
    showSummary("declined", 0);
  }, [clearRingTimer, localAccountId, peerAccountId, showSummary, stopMediaTracks]);

  const endCall = useCallback(async () => {
    if (statusRef.current === "calling") {
      await finishCall("cancelled", true);
      return;
    }
    if (statusRef.current === "ringing") {
      await rejectCall();
      return;
    }
    await finishCall("ended", true);
  }, [finishCall, rejectCall]);

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
      unsubscribeCallSignals(mediaChannelRef.current);
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
  if (!ctx) {
    throw new Error("useCall must be used within CallProvider");
  }
  return ctx;
}

export function useCallOptional(): CallContextValue | null {
  return useContext(CallContext);
}
