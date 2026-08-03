"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  buildCallChannelId,
  getDefaultIceServers,
  type CallContextType,
} from "@/lib/calls/config";
import {
  sendCallSignal,
  subscribeCallSignals,
  unsubscribeCallSignals,
  type CallSignalPayload,
} from "@/lib/calls/signaling";

export type CallStatus = "idle" | "calling" | "ringing" | "in-call" | "ended" | "error";
export type CallMode = "video" | "audio";

interface UseVideoCallOptions {
  contextType: CallContextType;
  contextId: string;
  localAccountId: string;
  peerLabel: string;
  enabled?: boolean;
}

function newCallId(): string {
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useVideoCall({
  contextType,
  contextId,
  localAccountId,
  peerLabel,
  enabled = true,
}: UseVideoCallOptions) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [mode, setMode] = useState<CallMode>("video");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const pendingOfferRef = useRef<{ sdp?: RTCSessionDescriptionInit; mode: CallMode } | null>(null);
  const statusRef = useRef<CallStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanupMedia = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream]);

  const endCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId && channelRef.current) {
      await sendCallSignal(channelRef.current, {
        type: "end",
        callId,
        from: localAccountId,
      });
    }
    cleanupMedia();
    callIdRef.current = null;
    isCallerRef.current = false;
    setStatus("ended");
    setTimeout(() => setStatus("idle"), 400);
  }, [cleanupMedia, localAccountId]);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: getDefaultIceServers() });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) setRemoteStream(remote);
      };

      pc.onicecandidate = (event) => {
        const callId = callIdRef.current;
        if (!event.candidate || !callId || !channelRef.current) return;
        void sendCallSignal(channelRef.current, {
          type: "ice",
          callId,
          from: localAccountId,
          candidate: event.candidate.toJSON(),
        });
      };

      pcRef.current = pc;
      return pc;
    },
    [localAccountId]
  );

  const handleSignal = useCallback(
    async (msg: CallSignalPayload) => {
      const activeCallId = callIdRef.current;

      const phase = statusRef.current;

      if (msg.type === "invite") {
        if (phase !== "idle" && phase !== "ended") return;
        callIdRef.current = msg.callId;
        isCallerRef.current = false;
        pendingOfferRef.current = { mode: msg.mode };
        setMode(msg.mode);
        setStatus("ringing");
        return;
      }

      if (msg.type === "offer" && !isCallerRef.current && phase === "ringing") {
        const pendingMode = pendingOfferRef.current?.mode ?? mode;
        pendingOfferRef.current = { sdp: msg.sdp, mode: pendingMode };
        return;
      }

      if (!activeCallId || msg.callId !== activeCallId) return;

      if (msg.type === "reject" || msg.type === "end") {
        cleanupMedia();
        setStatus("ended");
        setTimeout(() => setStatus("idle"), 400);
        return;
      }

      if (msg.type === "accept" && isCallerRef.current) {
        setStatus("in-call");
        return;
      }

      if (msg.type === "offer" && !isCallerRef.current && phase !== "ringing") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === "video",
          });
          setLocalStream(stream);
          const pc = createPeerConnection(stream);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendCallSignal(channelRef.current, {
            type: "answer",
            callId: activeCallId,
            from: localAccountId,
            sdp: answer,
          });
          await sendCallSignal(channelRef.current, {
            type: "accept",
            callId: activeCallId,
            from: localAccountId,
          });
          setStatus("in-call");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Call failed");
          setStatus("error");
        }
        return;
      }

      if (msg.type === "answer" && isCallerRef.current && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        setStatus("in-call");
        return;
      }

      if (msg.type === "ice" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {
          // Ignore stale ICE
        }
      }
    },
    [cleanupMedia, createPeerConnection, localAccountId, status]
  );

  useEffect(() => {
    if (!enabled || !contextId || !localAccountId) return;

    const channelId = buildCallChannelId(contextType, contextId);
    channelRef.current = subscribeCallSignals(channelId, localAccountId, (payload) => {
      void handleSignal(payload);
    });

    return () => {
      unsubscribeCallSignals(channelRef.current);
      channelRef.current = null;
    };
  }, [contextId, contextType, enabled, handleSignal, localAccountId]);

  const startCall = useCallback(
    async (nextMode: CallMode) => {
      if (!channelRef.current) {
        setError("Realtime signaling unavailable");
        setStatus("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: nextMode === "video",
        });
        setLocalStream(stream);
        setMode(nextMode);
        setError(null);

        const callId = newCallId();
        callIdRef.current = callId;
        isCallerRef.current = true;

        const pc = createPeerConnection(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendCallSignal(channelRef.current, {
          type: "invite",
          callId,
          from: localAccountId,
          mode: nextMode,
        });
        await sendCallSignal(channelRef.current, {
          type: "offer",
          callId,
          from: localAccountId,
          sdp: offer,
        });

        setStatus("calling");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not access camera/microphone");
        setStatus("error");
        cleanupMedia();
      }
    },
    [cleanupMedia, createPeerConnection, localAccountId]
  );

  const acceptCall = useCallback(async () => {
    const activeCallId = callIdRef.current;
    const pending = pendingOfferRef.current;
    if (status !== "ringing" || !activeCallId || !pending?.sdp || !channelRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: pending.mode === "video",
      });
      setLocalStream(stream);
      setMode(pending.mode);
      const pc = createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendCallSignal(channelRef.current, {
        type: "answer",
        callId: activeCallId,
        from: localAccountId,
        sdp: answer,
      });
      await sendCallSignal(channelRef.current, {
        type: "accept",
        callId: activeCallId,
        from: localAccountId,
      });
      pendingOfferRef.current = null;
      setStatus("in-call");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed");
      setStatus("error");
      cleanupMedia();
    }
  }, [cleanupMedia, createPeerConnection, localAccountId, status]);

  const rejectCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId && channelRef.current) {
      await sendCallSignal(channelRef.current, {
        type: "reject",
        callId,
        from: localAccountId,
      });
    }
    cleanupMedia();
    callIdRef.current = null;
    setStatus("idle");
  }, [cleanupMedia, localAccountId]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((v) => !v);
  }, [localStream]);

  return {
    status,
    mode,
    error,
    peerLabel,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    isActive: status === "calling" || status === "ringing" || status === "in-call",
  };
}
