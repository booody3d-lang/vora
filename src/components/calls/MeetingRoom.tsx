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

function useAttachStream(stream: MediaStream | null, muted: boolean) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = muted;
  }, [stream, muted]);
  return ref;
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
      ? "h-36 w-36 text-5xl"
      : size === "lg"
        ? "h-28 w-28 text-4xl"
        : size === "md"
          ? "h-16 w-16 text-2xl"
          : "h-10 w-10 text-sm";

  return (
    <div className="relative flex items-center justify-center">
      {pulsing && (
        <>
          <span className="absolute inset-[-10px] animate-ping rounded-full bg-white/10" />
          <span className="absolute inset-[-18px] animate-pulse rounded-full border border-white/20" />
        </>
      )}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br from-[#4C6FFF] via-[#3B5998] to-[#1E3A8A] font-bold text-white shadow-2xl shadow-blue-900/40",
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
        "flex h-14 w-14 flex-col items-center justify-center rounded-full text-xl shadow-lg transition active:scale-95",
        tone === "glass" && "bg-white/15 text-white backdrop-blur hover:bg-white/25",
        tone === "active" && "bg-white text-slate-900 hover:bg-white/90",
        tone === "danger" && "bg-red-500 text-white hover:bg-red-400",
        tone === "success" && "bg-emerald-500 text-white hover:bg-emerald-400"
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

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setSwapped(false);
    }
  }, [open]);

  const primaryStream = swapped ? (isCameraOff ? null : localStream) : remoteStream;
  const pipStream = swapped ? remoteStream : isCameraOff ? null : localStream;
  const primaryMuted = swapped;
  const pipMuted = !swapped;

  const primaryRef = useAttachStream(primaryStream, primaryMuted);
  const pipRef = useAttachStream(pipStream, pipMuted);
  const pipAudioOnly = mode === "audio";

  if (!open) return null;

  /* —— Call summary (Instagram-like end card) —— */
  if (status === "summary" && summary) {
    const ok = summary.kind === "ended" || summary.kind === "started";
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col items-center px-6 pb-2 pt-10">
            <div
              className={cn(
                "mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl",
                ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
              )}
            >
              {ok ? "✓" : summary.kind === "missed" ? "📞" : "✕"}
            </div>
            <AvatarOrb name={summary.peerLabel} size="lg" />
            <h2 className="mt-5 text-center text-xl font-semibold text-white">{summary.peerLabel}</h2>
            <p className="mt-1 text-sm text-white/50">
              {summary.mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
            </p>
            <p className="mt-4 text-base font-medium text-white/90">
              {t(`calls.event.${summary.kind}`)}
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tracking-wide text-white">
              {formatDuration(summary.durationSec)}
            </p>
          </div>
          <div className="p-6">
            <button
              type="button"
              onClick={onDismissSummary}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              {t("calls.summaryClose")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* —— Minimized PiP bubble (Instagram-style) —— */
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 end-4 z-[120] flex w-36 flex-col overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl ring-1 ring-black/40 transition hover:scale-[1.02] sm:bottom-6"
        aria-label={t("calls.expand")}
      >
        <div className="relative aspect-[3/4] w-full bg-slate-900">
          {mode === "video" && primaryStream ? (
            <video
              ref={primaryRef}
              autoPlay
              playsInline
              muted={primaryMuted}
              className={cn("h-full w-full object-cover", swapped && "scale-x-[-1]")}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#222] to-black">
              <AvatarOrb name={peerLabel} size="md" pulsing={status !== "in-call"} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
            <p className="truncate text-[11px] font-semibold text-white">{peerLabel}</p>
            <p className="font-mono text-[10px] text-white/70">
              {status === "in-call"
                ? formatDuration(durationSec)
                : status === "ringing"
                  ? t("calls.incomingHint")
                  : t("calls.ringingHint")}
            </p>
          </div>
          {status === "in-call" && (
            <span className="absolute start-2 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow" />
          )}
        </div>
      </button>
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

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/20"
        >
          {t("calls.minimize")}
        </button>
        <div className="text-center">
          <p className="max-w-[14rem] truncate text-sm font-semibold sm:max-w-xs">{title}</p>
          <p
            className={cn(
              "mt-0.5 font-mono text-xs",
              status === "in-call" ? "text-emerald-300" : "text-white/60"
            )}
          >
            {subtitle}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur">
          {mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
        </span>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1">
        {mode === "video" ? (
          <>
            {primaryStream ? (
              <video
                ref={primaryRef}
                autoPlay
                playsInline
                muted={primaryMuted}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  swapped && "scale-x-[-1]"
                )}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#1a1a2e] via-[#0f0f1a] to-black">
                <AvatarOrb
                  name={swapped ? t("calls.you") : peerLabel}
                  size="xl"
                  pulsing={status === "calling" || status === "ringing"}
                />
                <p className="text-lg font-medium text-white/90">
                  {swapped ? t("calls.you") : peerLabel}
                </p>
              </div>
            )}

            {/* PiP — tap to swap (Instagram style) */}
            <button
              type="button"
              onClick={() => setSwapped((v) => !v)}
              className="absolute bottom-36 end-4 z-20 h-40 w-[7.5rem] overflow-hidden rounded-2xl border-2 border-white/30 bg-black shadow-2xl transition hover:border-white/60 sm:bottom-40 sm:h-44 sm:w-32"
              aria-label={t("calls.swapCameras")}
            >
              {pipStream && !pipAudioOnly ? (
                <video
                  ref={pipRef}
                  autoPlay
                  playsInline
                  muted={pipMuted}
                  className={cn("h-full w-full object-cover", !swapped && "scale-x-[-1]")}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-900">
                  <AvatarOrb name={swapped ? peerLabel : t("calls.you")} size="sm" />
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] font-medium">
                {swapped ? peerLabel : t("calls.you")}
              </span>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#1a1a2e] via-[#12121f] to-black">
            <AvatarOrb
              name={peerLabel}
              size="xl"
              pulsing={status === "calling" || status === "ringing"}
            />
            <div className="text-center">
              <p className="text-2xl font-semibold">{peerLabel}</p>
              <p className="mt-2 text-sm text-white/55">{subtitle}</p>
            </div>
            {/* Keep remote audio alive even in audio-only UI */}
            {remoteStream && (
              <video ref={primaryRef} autoPlay playsInline className="pointer-events-none absolute h-0 w-0 opacity-0" />
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="absolute inset-x-0 bottom-36 z-20 px-6 text-center text-sm text-red-300 drop-shadow">
          {error}
        </p>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16">
        <div className="mx-auto flex max-w-md items-center justify-center gap-4 sm:gap-5">
          {status === "ringing" ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <RoundControl tone="danger" icon="📞" label={t("calls.decline")} onClick={onReject} />
                <span className="text-[11px] text-white/60">{t("calls.decline")}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <RoundControl tone="success" icon="✓" label={t("calls.accept")} onClick={onAccept} />
                <span className="text-[11px] text-white/60">{t("calls.accept")}</span>
              </div>
            </>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-2">
              <RoundControl tone="glass" icon="✕" label={t("calls.summaryClose")} onClick={onEnd} />
              <span className="text-[11px] text-white/60">{t("calls.summaryClose")}</span>
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
                <span className="text-[11px] text-white/60">
                  {isMuted ? t("calls.unmute") : t("calls.mute")}
                </span>
              </div>

              {mode === "video" && (
                <div className="flex flex-col items-center gap-2">
                  <RoundControl
                    tone={isCameraOff ? "active" : "glass"}
                    icon={isCameraOff ? "📷" : "📹"}
                    label={isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                    onClick={onToggleCamera}
                  />
                  <span className="text-[11px] text-white/60">
                    {isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                  </span>
                </div>
              )}

              {mode === "video" && (
                <div className="flex flex-col items-center gap-2">
                  <RoundControl
                    tone="glass"
                    icon="🔄"
                    label={t("calls.swapCameras")}
                    onClick={() => setSwapped((v) => !v)}
                  />
                  <span className="text-[11px] text-white/60">{t("calls.swapCameras")}</span>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <RoundControl
                  tone="danger"
                  icon="📵"
                  label={status === "calling" ? t("calls.cancel") : t("calls.leave")}
                  onClick={onEnd}
                />
                <span className="text-[11px] text-white/60">
                  {status === "calling" ? t("calls.cancel") : t("calls.leave")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
