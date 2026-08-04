"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { CallMode, CallStatus, CallSummary } from "@/providers/CallProvider";
import { formatDuration } from "@/lib/calls/call-events";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconClose,
  IconMic,
  IconMicOff,
  IconMinimize,
  IconPhoneEnd,
  IconSwap,
  IconVideo,
  IconVideoOff,
} from "@/components/calls/CallIcons";

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

/** Keep media in the tree without covering UI — never display:none. */
const SR_MEDIA =
  "pointer-events-none absolute h-px w-px overflow-hidden opacity-0";

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
      ? "h-36 w-36 text-5xl"
      : size === "lg"
        ? "h-24 w-24 text-3xl"
        : size === "md"
          ? "h-14 w-14 text-xl"
          : "h-10 w-10 text-sm";

  return (
    <div className="relative flex items-center justify-center">
      {pulsing && <span className="absolute inset-[-12px] animate-ping rounded-full bg-white/15" />}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-b from-[#5A7FBF] to-[#2F4A86] font-semibold text-white ring-1 ring-white/25",
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
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95",
        tone === "glass" && "bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white/25",
        tone === "active" && "bg-white text-slate-900",
        tone === "danger" && "bg-[#FF3B30] text-white hover:bg-[#ff5248]",
        tone === "success" && "bg-[#34C759] text-white hover:bg-[#3dd368]"
      )}
    >
      {icon}
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
  const [mounted, setMounted] = useState(false);

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setSwapped(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || minimized) {
      document.body.style.removeProperty("overflow");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, minimized]);

  useEffect(() => {
    attach(remoteAudioRef.current, remoteStream, false);
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

  if (!open || !mounted) return null;

  if (status === "summary" && summary) {
    const ok = summary.kind === "ended";
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
        style={{ width: "100vw", height: "100dvh" }}
      >
        <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-[#121212] ring-1 ring-white/10">
          <div className="flex flex-col items-center px-6 pb-2 pt-10">
            <div
              className={cn(
                "mb-5 flex h-12 w-12 items-center justify-center rounded-full",
                ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
              )}
            >
              {ok ? <IconCheck size={22} /> : <IconClose size={20} />}
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
      </div>,
      document.body
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

  const showFullscreenAvatar =
    (!isVideo && !minimized) || (isVideo && remotePrimary && !hasRemoteVideo && !minimized);

  return createPortal(
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className={SR_MEDIA} />

      <div
        className={cn(
          "overflow-hidden bg-black text-white",
          minimized
            ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] end-3 z-[9999] h-[13.5rem] w-[9.75rem] rounded-[26px] shadow-2xl ring-1 ring-white/25 sm:bottom-6"
            : "fixed inset-0 z-[9999]"
        )}
        style={minimized ? undefined : { width: "100vw", height: "100dvh" }}
      >
        {/* Opaque full-bleed stage — never let the page show through */}
        <div className="absolute inset-0 bg-black">
          {isVideo && (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute bg-black object-cover transition-all duration-200",
                  minimized || remotePrimary
                    ? "inset-0 h-full w-full"
                    : "bottom-4 end-3 h-[7.5rem] w-[5.5rem] rounded-2xl ring-1 ring-white/30"
                )}
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "scale-x-[-1] bg-black object-cover transition-all duration-200",
                  minimized || !isVideo
                    ? SR_MEDIA
                    : !remotePrimary
                      ? "absolute inset-0 h-full w-full"
                      : "absolute bottom-4 end-3 z-20 h-[7.5rem] w-[5.5rem] rounded-2xl ring-1 ring-white/30"
                )}
              />
            </>
          )}
          {!isVideo && <video ref={remoteVideoRef} autoPlay playsInline muted className={SR_MEDIA} />}
          {!isVideo && <video ref={localVideoRef} autoPlay playsInline muted className={SR_MEDIA} />}

          {showFullscreenAvatar && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0a0a0a]">
              <AvatarOrb
                name={peerLabel}
                size="xl"
                pulsing={status === "calling" || status === "ringing"}
              />
              <div className="text-center">
                <p className="text-2xl font-semibold">{peerLabel}</p>
                <p className="mt-2 text-sm text-white/50">{subtitle}</p>
              </div>
            </div>
          )}

          {minimized && !hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
              <AvatarOrb name={peerLabel} size="md" pulsing={status !== "in-call"} />
            </div>
          )}
        </div>

        {minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="absolute inset-0 z-30"
            aria-label={t("calls.expand")}
          >
            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2.5 pb-2.5 pt-8 text-start">
              <p className="truncate text-[11px] font-semibold">{peerLabel}</p>
              <p className="font-mono text-[10px] text-emerald-300">
                {status === "in-call" ? formatDuration(durationSec) : subtitle}
              </p>
            </div>
            {status === "in-call" && (
              <span className="absolute start-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>
        ) : (
          <>
            {isVideo && (
              <button
                type="button"
                onClick={() => setSwapped((v) => !v)}
                className="absolute bottom-4 end-3 z-30 h-[7.5rem] w-[5.5rem] rounded-2xl"
                aria-label={t("calls.swapCameras")}
              >
                <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-black/70 py-1 text-center text-[10px] font-medium">
                  {remotePrimary ? t("calls.you") : peerLabel}
                </span>
                {!remotePrimary && !hasRemoteVideo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <AvatarOrb name={peerLabel} size="sm" />
                  </span>
                )}
                {remotePrimary && !hasLocalVideo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <AvatarOrb name={t("calls.you")} size="sm" />
                  </span>
                )}
              </button>
            )}

            <div className="absolute inset-x-0 top-0 z-40 bg-black/80 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15"
                >
                  <IconMinimize size={14} />
                  {t("calls.minimize")}
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-xs",
                      status === "in-call" ? "text-emerald-300" : "text-white/55"
                    )}
                  >
                    {subtitle}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 ring-1 ring-white/15">
                  {isVideo ? t("calls.videoMode") : t("calls.audioMode")}
                </span>
              </div>
            </div>

            {error && (
              <p className="absolute inset-x-0 bottom-40 z-40 px-6 text-center text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="absolute inset-x-0 bottom-0 z-40 bg-black px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10">
              <div className="mx-auto flex max-w-md items-end justify-center gap-5">
                {status === "ringing" ? (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl
                        tone="danger"
                        icon={<IconPhoneEnd size={22} />}
                        label={t("calls.decline")}
                        onClick={onReject}
                      />
                      <span className="text-[11px] text-white/55">{t("calls.decline")}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl
                        tone="success"
                        icon={<IconCheck size={24} />}
                        label={t("calls.accept")}
                        onClick={onAccept}
                      />
                      <span className="text-[11px] text-white/55">{t("calls.accept")}</span>
                    </div>
                  </>
                ) : status === "error" ? (
                  <div className="flex flex-col items-center gap-2">
                    <RoundControl
                      tone="glass"
                      icon={<IconClose size={20} />}
                      label={t("calls.summaryClose")}
                      onClick={onEnd}
                    />
                    <span className="text-[11px] text-white/55">{t("calls.summaryClose")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl
                        tone={isMuted ? "active" : "glass"}
                        icon={isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
                        label={isMuted ? t("calls.unmute") : t("calls.mute")}
                        onClick={onToggleMute}
                      />
                      <span className="text-[11px] text-white/55">
                        {isMuted ? t("calls.unmute") : t("calls.mute")}
                      </span>
                    </div>
                    {isVideo && (
                      <div className="flex flex-col items-center gap-2">
                        <RoundControl
                          tone={isCameraOff ? "active" : "glass"}
                          icon={
                            isCameraOff ? <IconVideoOff size={22} /> : <IconVideo size={22} />
                          }
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
                        <RoundControl
                          tone="glass"
                          icon={<IconSwap size={22} />}
                          label={t("calls.swapCameras")}
                          onClick={() => setSwapped((v) => !v)}
                        />
                        <span className="text-[11px] text-white/55">{t("calls.swapCameras")}</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <RoundControl
                        tone="danger"
                        icon={<IconPhoneEnd size={22} />}
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
      </div>
    </>,
    document.body
  );
}
