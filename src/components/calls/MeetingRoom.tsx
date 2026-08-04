"use client";

import { useEffect, useRef } from "react";

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

function VideoTile({
  stream,
  label,
  mirrored,
  className,
  avatarFallback,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
  className?: string;
  avatarFallback?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
  }, [stream]);

  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-[#0B1220]", className)}>
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={mirrored}
          className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]")}
        />
      ) : (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#1E293B] to-[#0F172A]">
          {avatarFallback !== false && (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#3B5998] text-3xl font-bold text-white shadow-lg shadow-[#3B5998]/30">
              {initial}
            </div>
          )}
          <p className="text-sm font-medium text-slate-300">{label}</p>
        </div>
      )}
      <span className="absolute bottom-3 start-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {label}
      </span>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  tone = "neutral",
  large,
}: {
  onClick: () => void;
  label: string;
  tone?: "neutral" | "danger" | "success";
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[4.5rem] rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110",
        large && "min-w-[7rem] px-6 py-3.5 text-base",
        tone === "neutral" && "bg-white/10 hover:bg-white/15",
        tone === "danger" && "bg-red-600 hover:bg-red-500",
        tone === "success" && "bg-emerald-600 hover:bg-emerald-500"
      )}
    >
      {label}
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

  if (!open) return null;

  if (status === "summary" && summary) {
    const kindLabel = t(`calls.event.${summary.kind}`);
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020617]/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1E293B] to-[#0F172A] shadow-2xl">
          <div className="border-b border-white/10 px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93C5FD]">
              {t("calls.summaryTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">{summary.peerLabel}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {summary.mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
            </p>
          </div>
          <div className="space-y-3 px-6 py-6">
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">{t("calls.summaryResult")}</p>
              <p className="mt-1 text-base font-semibold text-white">{kindLabel}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">{t("calls.summaryDuration")}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#93C5FD]">
                {formatDuration(summary.durationSec)}
              </p>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={onDismissSummary}
              className="w-full rounded-2xl bg-[#3B5998] px-6 py-3.5 text-base font-semibold text-white shadow-lg hover:brightness-110"
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
        : t("calls.inCall", { name: peerLabel });

  const statusHint =
    status === "calling"
      ? t("calls.ringingHint")
      : status === "ringing"
        ? t("calls.incomingHint")
        : formatDuration(durationSec);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:p-6">
      <div className="flex h-full max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1220] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full bg-white/10 px-2 py-0.5">
                {mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  status === "in-call"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : status === "ringing"
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-sky-500/20 text-sky-200"
                )}
              >
                {statusHint}
              </span>
            </div>
          </div>
          {status === "in-call" && (
            <div className="rounded-full bg-black/40 px-3 py-1.5 font-mono text-sm font-semibold text-white">
              {formatDuration(durationSec)}
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 p-3 sm:p-5">
          {mode === "video" ? (
            <div className="relative h-full min-h-[320px]">
              <VideoTile
                stream={remoteStream}
                label={peerLabel}
                className="h-full min-h-[320px]"
              />
              <div className="absolute bottom-4 end-4 h-28 w-24 overflow-hidden rounded-2xl border border-white/20 shadow-xl sm:h-36 sm:w-28">
                <VideoTile
                  stream={isCameraOff ? null : localStream}
                  label={t("calls.you")}
                  mirrored
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-36 w-36 items-center justify-center rounded-full bg-[#3B5998] text-5xl font-bold text-white",
                      (status === "calling" || status === "ringing") && "animate-pulse"
                    )}
                  >
                    {peerLabel.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  {(status === "calling" || status === "ringing") && (
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#3B5998]/50" />
                  )}
                </div>
                <p className="text-xl font-semibold text-white">{peerLabel}</p>
                <p className="text-sm text-slate-400">{statusHint}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="px-5 pb-2 text-center text-sm text-red-300">{error}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-black/30 px-4 py-5">
          {status === "ringing" ? (
            <>
              <ControlButton large tone="success" label={t("calls.accept")} onClick={onAccept} />
              <ControlButton large tone="danger" label={t("calls.decline")} onClick={onReject} />
            </>
          ) : status === "error" ? (
            <ControlButton large tone="neutral" label={t("calls.summaryClose")} onClick={onEnd} />
          ) : (
            <>
              <ControlButton
                tone="neutral"
                label={isMuted ? t("calls.unmute") : t("calls.mute")}
                onClick={onToggleMute}
              />
              {mode === "video" && (
                <ControlButton
                  tone="neutral"
                  label={isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                  onClick={onToggleCamera}
                />
              )}
              <ControlButton
                large
                tone="danger"
                label={status === "calling" ? t("calls.cancel") : t("calls.leave")}
                onClick={onEnd}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
