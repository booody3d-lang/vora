"use client";

import { useEffect, useRef, useState } from "react";

import type { CallMode, CallStatus, CallSummary } from "@/providers/CallProvider";
import { formatDuration } from "@/lib/calls/call-events";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface MeetingRoomProps {
  open: boolean;
  status: CallStatus;
  mode: CallMode;
  peerLabel: string;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  durationSec: number;
  summary: CallSummary | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onDismissSummary: () => void;
}

/** Never use display:none — Chrome suspends media playback. */
const SR_MEDIA =
  "pointer-events-none fixed start-0 top-0 -z-10 h-[3px] w-[3px] opacity-[0.02]";

function attach(el: HTMLMediaElement | null, stream: MediaStream | null, muted: boolean) {
  if (!el) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  el.muted = muted;
  if (!muted) el.volume = 1;
  if (stream) void el.play().catch(() => undefined);
}

function AvatarOrb({
  name,
  pulsing,
  size = "lg",
}: {
  name: string;
  pulsing?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const sizeClass =
    size === "xl"
      ? "h-40 w-40 text-5xl"
      : size === "lg"
        ? "h-28 w-28 text-4xl"
        : size === "md"
          ? "h-16 w-16 text-2xl"
          : "h-11 w-11 text-sm";

  return (
    <div className="relative flex items-center justify-center">
      {pulsing && <span className="absolute inset-[-14px] animate-ping rounded-full bg-[#5B8CFF]/20" />}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#8EB6FF,#3B5998_58%,#1E3A8A)] font-bold text-white shadow-[0_18px_50px_rgba(59,89,152,0.45)] ring-2 ring-white/20",
          sizeClass
        )}
      >
        {initial}
      </div>
    </div>
  );
}

function RoundControl({
  label,
  onClick,
  tone = "glass",
  icon,
}: {
  label: string;
  onClick: () => void;
  tone?: "glass" | "danger" | "success" | "active";
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-full text-[1.35rem] shadow-lg transition active:scale-95",
        tone === "glass" && "bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-white/20",
        tone === "active" && "bg-white text-slate-900",
        tone === "danger" && "bg-[#FF3B30] text-white hover:bg-[#ff5248]",
        tone === "success" && "bg-[#34C759] text-white hover:bg-[#3dd368]"
      )}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}

export function MeetingRoom({
  open,
  status,
  mode,
  peerLabel,
  error,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  durationSec,
  summary,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onDismissSummary,
}: MeetingRoomProps) {
  const { t } = useTranslations();
  const [minimized, setMinimized] = useState(false);
  const [swapped, setSwapped] = useState(false);

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setSwapped(false);
    }
  }, [open]);

  useEffect(() => {
    attach(remoteAudioRef.current, remoteStream, false);
    // Video tags stay muted — hearing always comes from <audio>
    attach(remoteVideoRef.current, remoteStream, true);
  }, [remoteStream, open, status]);

  useEffect(() => {
    attach(localVideoRef.current, isCameraOff ? null : localStream, true);
  }, [localStream, isCameraOff, open, status]);

  useEffect(() => {
    const kick = (el: HTMLMediaElement | null) => {
      if (el?.srcObject) void el.play().catch(() => undefined);
    };
    kick(remoteAudioRef.current);
    kick(remoteVideoRef.current);
    kick(localVideoRef.current);
  }, [minimized, swapped, mode, remoteStream, localStream, status]);

  if (!open) return null;

  if (status === "summary" && summary) {
    const ok = summary.kind === "ended";
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl">
        <div className="w-full max-w-sm overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#1c1c2e,#0b0b14)] shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col items-center px-6 pb-2 pt-10">
            <div
              className={cn(
                "mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl",
                ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
              )}
            >
              {ok ? "✓" : summary.kind === "missed" ? "📞" : "✕"}
            </div>
            <AvatarOrb name={summary.peerLabel} size="lg" />
            <h2 className="mt-5 text-center text-xl font-semibold text-white">{summary.peerLabel}</h2>
            <p className="mt-1 text-sm text-white/45">
              {summary.mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
            </p>
            <p className="mt-5 text-[15px] font-medium text-white/90">
              {t(`calls.event.${summary.kind}`)}
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold text-white">
              {formatDuration(summary.durationSec)}
            </p>
          </div>
          <div className="p-6">
            <button
              type="button"
              onClick={onDismissSummary}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-slate-900 hover:bg-white/90"
            >
              {t("calls.summaryClose")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title =
    status === "ringing"
      ? t("calls.incoming", { name: peerLabel })
      : status === "calling"
        ? t("calls.calling", { name: peerLabel })
        : peerLabel;

  const subtitle =
    status === "in-call"
      ? formatDuration(durationSec)
      : status === "calling"
        ? t("calls.ringingHint")
        : status === "ringing"
          ? t("calls.incomingHint")
          : formatDuration(durationSec);

  const isVideo = mode === "video";
  const remotePrimary = !swapped;
  const hasRemoteVideo = Boolean(
    remoteStream?.getVideoTracks().some((tr) => tr.readyState === "live")
  );
  const hasLocalVideo = Boolean(
    !isCameraOff && localStream?.getVideoTracks().some((tr) => tr.readyState === "live")
  );

  // Single remote video element — CSS moves it between full / pip / minimized bubble
  const remoteVideoClass = cn(
    "bg-black object-cover transition-all duration-200",
    minimized
      ? "fixed bottom-24 end-4 z-[120] h-[13.5rem] w-[9.5rem] rounded-[28px] shadow-2xl ring-1 ring-white/25 sm:bottom-6"
      : isVideo
        ? remotePrimary
          ? "fixed inset-0 z-[110]"
          : "fixed bottom-[8.5rem] end-4 z-[130] h-[11rem] w-[8rem] rounded-[26px] shadow-2xl ring-2 ring-white/25 sm:bottom-40 sm:h-44 sm:w-32"
        : SR_MEDIA
  );

  const localVideoClass = cn(
    "scale-x-[-1] bg-black object-cover transition-all duration-200",
    minimized || !isVideo
      ? SR_MEDIA
      : !remotePrimary
        ? "fixed inset-0 z-[110]"
        : "fixed bottom-[8.5rem] end-4 z-[130] h-[11rem] w-[8rem] rounded-[26px] shadow-2xl ring-2 ring-white/25 sm:bottom-40 sm:h-44 sm:w-32"
  );

  return (
    <>
      {/* Hearing path — independent of video layout / minimize */}
      <audio ref={remoteAudioRef} autoPlay playsInline className={SR_MEDIA} />

      <video ref={remoteVideoRef} autoPlay playsInline muted className={remoteVideoClass} />
      <video ref={localVideoRef} autoPlay playsInline muted className={localVideoClass} />

      {/* Fallback avatar when remote has no video track (or audio-only) */}
      {((!isVideo && !minimized) || (isVideo && remotePrimary && !hasRemoteVideo && !minimized)) && (
        <div className="fixed inset-0 z-[105] flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_top,#1b2748,#07070d_60%,#000)]">
          <AvatarOrb name={peerLabel} size="xl" pulsing={status === "calling" || status === "ringing"} />
          <div className="text-center text-white">
            <p className="text-2xl font-semibold">{peerLabel}</p>
            <p className="mt-2 text-sm text-white/50">{subtitle}</p>
          </div>
        </div>
      )}

      {minimized && !hasRemoteVideo && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="fixed bottom-24 end-4 z-[121] flex h-[13.5rem] w-[9.5rem] items-center justify-center rounded-[28px] bg-[#0B0B12] shadow-2xl ring-1 ring-white/20 sm:bottom-6"
        >
          <AvatarOrb name={peerLabel} size="md" pulsing={status !== "in-call"} />
        </button>
      )}

      {minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="fixed bottom-24 end-4 z-[122] h-[13.5rem] w-[9.5rem] rounded-[28px] sm:bottom-6"
          aria-label={t("calls.expand")}
        >
          <div className="absolute inset-x-0 bottom-0 rounded-b-[28px] bg-gradient-to-t from-black/90 to-transparent px-2.5 pb-2.5 pt-10 text-start">
            <p className="truncate text-[11px] font-semibold text-white">{peerLabel}</p>
            <p className="font-mono text-[10px] text-emerald-300">
              {status === "in-call" ? formatDuration(durationSec) : subtitle}
            </p>
          </div>
          {status === "in-call" && (
            <span className="absolute start-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          )}
        </button>
      )}

      {!minimized && (
        <>
          {/* Swap hit-area over PiP */}
          {isVideo && (
            <button
              type="button"
              onClick={() => setSwapped((v) => !v)}
              className="fixed bottom-[8.5rem] end-4 z-[140] h-[11rem] w-[8rem] rounded-[26px] sm:bottom-40 sm:h-44 sm:w-32"
              aria-label={t("calls.swapCameras")}
            >
              <span className="absolute inset-x-0 bottom-0 rounded-b-[26px] bg-black/55 py-1 text-center text-[10px] font-medium text-white">
                {remotePrimary ? t("calls.you") : peerLabel}
              </span>
              {!remotePrimary && !hasRemoteVideo && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <AvatarOrb name={peerLabel} size="sm" />
                </span>
              )}
              {remotePrimary && !hasLocalVideo && (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                  <AvatarOrb name={t("calls.you")} size="sm" />
                </span>
              )}
            </button>
          )}

          <div className="pointer-events-none fixed inset-x-0 top-0 z-[150] bg-gradient-to-b from-black/75 via-black/20 to-transparent px-4 pb-14 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto flex items-start justify-between gap-3 text-white">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/10 backdrop-blur-md hover:bg-white/16"
              >
                {t("calls.minimize")}
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className={cn("mt-0.5 font-mono text-xs", status === "in-call" ? "text-emerald-300" : "text-white/55")}>
                  {subtitle}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 ring-1 ring-white/10 backdrop-blur-md">
                {isVideo ? t("calls.videoMode") : t("calls.audioMode")}
              </span>
            </div>
          </div>

          {error && (
            <p className="fixed inset-x-0 bottom-40 z-[150] px-6 text-center text-sm text-red-300">{error}</p>
          )}

          <div className="fixed inset-x-0 bottom-0 z-[150] bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-[max(1.35rem,env(safe-area-inset-bottom))] pt-16">
            <div className="mx-auto flex max-w-md items-end justify-center gap-5 text-white">
              {status === "ringing" ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <RoundControl tone="danger" icon="📞" label={t("calls.decline")} onClick={onReject} />
                    <span className="text-[11px] text-white/55">{t("calls.decline")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <RoundControl tone="success" icon="✓" label={t("calls.accept")} onClick={onAccept} />
                    <span className="text-[11px] text-white/55">{t("calls.accept")}</span>
                  </div>
                </>
              ) : status === "error" ? (
                <div className="flex flex-col items-center gap-2">
                  <RoundControl tone="glass" icon="✕" label={t("calls.summaryClose")} onClick={onEnd} />
                  <span className="text-[11px] text-white/55">{t("calls.summaryClose")}</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <RoundControl
                      tone={isMuted ? "active" : "glass"}
                      icon={isMuted ? "🔇" : "🎤"}
                      label={isMuted ? t("calls.unmute") : t("calls.mute")}
                      onClick={onToggleMute}
                    />
                    <span className="text-[11px] text-white/55">{isMuted ? t("calls.unmute") : t("calls.mute")}</span>
                  </div>
                  {isVideo && (
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl
                        tone={isCameraOff ? "active" : "glass"}
                        icon={isCameraOff ? "📷" : "📹"}
                        label={isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                        onClick={onToggleCamera}
                      />
                      <span className="text-[11px] text-white/55">
                        {isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                      </span>
                    </div>
                  )}
                  {isVideo && (
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl tone="glass" icon="🔄" label={t("calls.swapCameras")} onClick={() => setSwapped((v) => !v)} />
                      <span className="text-[11px] text-white/55">{t("calls.swapCameras")}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <RoundControl
                      tone="danger"
                      icon="📵"
                      label={status === "calling" ? t("calls.cancel") : t("calls.leave")}
                      onClick={onEnd}
                    />
                    <span className="text-[11px] text-white/55">
                      {status === "calling" ? t("calls.cancel") : t("calls.leave")}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
