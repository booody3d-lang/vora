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
  IconFlipCamera,
  IconMic,
  IconMicOff,
  IconMinimize,
  IconPhoneEnd,
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
  onFlipCamera: () => void;
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
          "flex items-center justify-center rounded-full bg-gradient-to-b from-[#6B8FC4] to-[#2F4A86] font-semibold text-white ring-1 ring-white/25",
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full transition active:scale-95",
        tone === "glass" && "bg-black/35 text-white ring-1 ring-white/25 backdrop-blur-md",
        tone === "active" && "bg-white text-slate-900",
        tone === "danger" && "bg-[#FF3B30] text-white",
        tone === "success" && "bg-[#34C759] text-white"
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
  onFlipCamera,
  onDismissSummary,
}: MeetingRoomProps) {
  const { t } = useTranslations();
  const [minimized, setMinimized] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setSwapped(false);
      setChromeVisible(true);
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

  // Auto-hide chrome during active call (keep visible for ringing / calling / error)
  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (!open || minimized) return;
    if (status === "ringing" || status === "calling" || status === "error") {
      setChromeVisible(true);
      return;
    }
    if (!chromeVisible || status !== "in-call") return;
    hideTimerRef.current = setTimeout(() => setChromeVisible(false), 3500);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [chromeVisible, open, minimized, status]);

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
  }, [minimized, swapped, mode, remoteStream, localStream, status, chromeVisible]);

  if (!open || !mounted) return null;

  if (status === "summary" && summary) {
    const ok = summary.kind === "ended";
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0c0c10]/95 p-4 backdrop-blur-sm"
        style={{ width: "100vw", height: "100dvh" }}
      >
        <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-[#16161c] ring-1 ring-white/10">
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
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-slate-900"
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
  const showStageAvatar =
    (!isVideo && !minimized) || (isVideo && remotePrimary && !hasRemoteVideo && !minimized);

  function revealChrome() {
    setChromeVisible(true);
  }

  function onStageTap() {
    if (minimized) return;
    if (status === "ringing" || status === "calling" || status === "error") return;
    setChromeVisible((v) => !v);
  }

  const pipClass =
    "absolute z-20 h-[9.5rem] w-[7rem] overflow-hidden rounded-[22px] bg-black shadow-xl ring-1 ring-white/30 sm:h-44 sm:w-32";
  const pipPos = chromeVisible
    ? "top-[max(4.75rem,calc(env(safe-area-inset-top)+3.25rem))] end-3"
    : "top-[max(1rem,env(safe-area-inset-top))] end-3";

  return createPortal(
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className={SR_MEDIA} />

      <div
        className={cn(
          "overflow-hidden text-white",
          minimized
            ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] end-3 z-[9999] h-[13.5rem] w-[9.75rem] rounded-[26px] shadow-2xl ring-1 ring-white/25 sm:bottom-6"
            : "fixed inset-0 z-[9999]"
        )}
        style={minimized ? undefined : { width: "100vw", height: "100dvh" }}
        onClick={onStageTap}
      >
        {/* Full-bleed stage */}
        <div
          className={cn(
            "absolute inset-0",
            isVideo
              ? "bg-[#111]"
              : "bg-[radial-gradient(circle_at_30%_20%,#24365f_0%,#12141c_45%,#0a0b10_100%)]"
          )}
        >
          {/* Always mount both videos so refs stay stable across audio/video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "bg-black object-cover transition-all duration-200",
              !isVideo || minimized
                ? hasRemoteVideo && minimized
                  ? "absolute inset-0 h-full w-full"
                  : SR_MEDIA
                : remotePrimary
                  ? "absolute inset-0 h-full w-full"
                  : cn(pipClass, pipPos)
            )}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "scale-x-[-1] bg-black object-cover transition-all duration-200",
              !isVideo || minimized
                ? SR_MEDIA
                : !remotePrimary
                  ? "absolute inset-0 h-full w-full"
                  : cn(pipClass, pipPos)
            )}
          />

          {showStageAvatar && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <AvatarOrb
                name={peerLabel}
                size="xl"
                pulsing={status === "calling" || status === "ringing"}
              />
              <div className="text-center">
                <p className="text-2xl font-semibold">{peerLabel}</p>
                <p className="mt-2 text-sm text-white/55">{subtitle}</p>
              </div>
            </div>
          )}

          {minimized && !hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#12141c]">
              <AvatarOrb name={peerLabel} size="md" pulsing={status !== "in-call"} />
            </div>
          )}
        </div>

        {minimized ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(false);
              revealChrome();
            }}
            className="absolute inset-0 z-30"
            aria-label={t("calls.expand")}
          >
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2.5 pt-10 text-start">
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
            {/* PiP tap target — swap local/remote */}
            {isVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSwapped((v) => !v);
                  revealChrome();
                }}
                className={cn(pipClass, pipPos, "bg-transparent")}
                aria-label={t("calls.swapViews")}
              >
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent py-1.5 text-center text-[10px] font-medium">
                  {remotePrimary ? t("calls.you") : peerLabel}
                </span>
                {remotePrimary && !hasLocalVideo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <AvatarOrb name={t("calls.you")} size="sm" />
                  </span>
                )}
                {!remotePrimary && !hasRemoteVideo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <AvatarOrb name={peerLabel} size="sm" />
                  </span>
                )}
              </button>
            )}

            {/* Floating chrome — no solid black bars */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-40 transition-opacity duration-200",
                chromeVisible ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/15 to-transparent px-4 pb-16 pt-[max(0.85rem,env(safe-area-inset-top))]">
                <div
                  className={cn(
                    "pointer-events-auto flex items-start justify-between gap-3",
                    !chromeVisible && "pointer-events-none"
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinimized(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur-md"
                  >
                    <IconMinimize size={14} />
                    {t("calls.minimize")}
                  </button>
                  <div className="min-w-0 text-center drop-shadow">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono text-xs",
                        status === "in-call" ? "text-emerald-300" : "text-white/70"
                      )}
                    >
                      {subtitle}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 ring-1 ring-white/15 backdrop-blur-md">
                    {isVideo ? t("calls.videoMode") : t("calls.audioMode")}
                  </span>
                </div>
              </div>

              {error && (
                <p className="pointer-events-none absolute inset-x-0 bottom-36 px-6 text-center text-sm text-red-300 drop-shadow">
                  {error}
                </p>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-20">
                <div
                  className={cn(
                    "pointer-events-auto mx-auto flex max-w-md items-end justify-center gap-4",
                    !chromeVisible && "pointer-events-none"
                  )}
                >
                  {status === "ringing" ? (
                    <>
                      <div className="flex flex-col items-center gap-1.5">
                        <RoundControl
                          tone="danger"
                          icon={<IconPhoneEnd size={22} />}
                          label={t("calls.decline")}
                          onClick={onReject}
                        />
                        <span className="text-[11px] text-white/80 drop-shadow">{t("calls.decline")}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <RoundControl
                          tone="success"
                          icon={<IconCheck size={24} />}
                          label={t("calls.accept")}
                          onClick={onAccept}
                        />
                        <span className="text-[11px] text-white/80 drop-shadow">{t("calls.accept")}</span>
                      </div>
                    </>
                  ) : status === "error" ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <RoundControl
                        tone="glass"
                        icon={<IconClose size={20} />}
                        label={t("calls.summaryClose")}
                        onClick={onEnd}
                      />
                      <span className="text-[11px] text-white/80">{t("calls.summaryClose")}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-1.5">
                        <RoundControl
                          tone={isMuted ? "active" : "glass"}
                          icon={isMuted ? <IconMicOff size={22} /> : <IconMic size={22} />}
                          label={isMuted ? t("calls.unmute") : t("calls.mute")}
                          onClick={onToggleMute}
                        />
                        <span className="text-[11px] text-white/80 drop-shadow">
                          {isMuted ? t("calls.unmute") : t("calls.mute")}
                        </span>
                      </div>
                      {isVideo && (
                        <div className="flex flex-col items-center gap-1.5">
                          <RoundControl
                            tone={isCameraOff ? "active" : "glass"}
                            icon={
                              isCameraOff ? <IconVideoOff size={22} /> : <IconVideo size={22} />
                            }
                            label={isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                            onClick={onToggleCamera}
                          />
                          <span className="text-[11px] text-white/80 drop-shadow">
                            {isCameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                          </span>
                        </div>
                      )}
                      {isVideo && (
                        <div className="flex flex-col items-center gap-1.5">
                          <RoundControl
                            tone="glass"
                            icon={<IconFlipCamera size={22} />}
                            label={t("calls.flipCamera")}
                            onClick={onFlipCamera}
                          />
                          <span className="text-[11px] text-white/80 drop-shadow">
                            {t("calls.flipCamera")}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1.5">
                        <RoundControl
                          tone="danger"
                          icon={<IconPhoneEnd size={22} />}
                          label={status === "calling" ? t("calls.cancel") : t("calls.leave")}
                          onClick={onEnd}
                        />
                        <span className="text-[11px] text-white/80 drop-shadow">
                          {status === "calling" ? t("calls.cancel") : t("calls.leave")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
