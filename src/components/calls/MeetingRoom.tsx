"use client";

import { useEffect, useRef } from "react";

import type { CallMode, CallStatus } from "@/hooks/useVideoCall";
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
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function VideoTile({
  stream,
  label,
  mirrored,
  className,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
  }, [stream]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-slate-900", className)}>
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={mirrored}
          className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]")}
        />
      ) : (
        <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-slate-400">
          {label}
        </div>
      )}
      <span className="absolute bottom-2 start-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
        {label}
      </span>
    </div>
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
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: MeetingRoomProps) {
  const { t } = useTranslations();

  if (!open) return null;

  const title =
    status === "ringing"
      ? t("calls.incoming", { name: peerLabel })
      : status === "calling"
        ? t("calls.calling", { name: peerLabel })
        : t("calls.inCall", { name: peerLabel });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl bg-[#0F172A] p-4 shadow-2xl md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-xs text-slate-400">
              {mode === "video" ? t("calls.videoMode") : t("calls.audioMode")}
            </p>
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>

        <div
          className={cn(
            "grid gap-3",
            mode === "video" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}
        >
          <VideoTile stream={remoteStream} label={peerLabel} className="min-h-[200px] md:min-h-[240px]" />
          {mode === "video" && (
            <VideoTile
              stream={isCameraOff ? null : localStream}
              label={t("calls.you")}
              mirrored
              className="min-h-[140px] md:min-h-[240px]"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {status === "ringing" ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                {t("calls.accept")}
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              >
                {t("calls.decline")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleMute}
                className="rounded-full bg-slate-700 px-4 py-2.5 text-sm text-white hover:bg-slate-600"
              >
                {isMuted ? t("calls.unmute") : t("calls.mute")}
              </button>
              {mode === "video" && (
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="rounded-full bg-slate-700 px-4 py-2.5 text-sm text-white hover:bg-slate-600"
                >
                  {isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                </button>
              )}
              <button
                type="button"
                onClick={onEnd}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              >
                {t("calls.leave")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
