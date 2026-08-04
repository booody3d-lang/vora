"use client";

import { MeetingRoom } from "@/components/calls/MeetingRoom";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useTranslations } from "@/i18n/use-translations";
import { isVideoCallsEnabled, type CallContextType } from "@/lib/calls/config";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  contextType: CallContextType;
  contextId: string;
  localAccountId: string;
  peerLabel: string;
  disabled?: boolean;
  compact?: boolean;
}

export function CallControls({
  contextType,
  contextId,
  localAccountId,
  peerLabel,
  disabled = false,
  compact = false,
}: CallControlsProps) {
  const { t } = useTranslations();
  const { role } = usePermissions();
  const enabled = isVideoCallsEnabled() && role !== "company" && Boolean(localAccountId) && !disabled;

  const call = useVideoCall({
    contextType,
    contextId,
    localAccountId,
    peerLabel,
    enabled,
  });

  if (!enabled) return null;

  return (
    <>
      <div className={cn("flex shrink-0 items-center", compact ? "gap-0.5" : "gap-1")}>
        <button
          type="button"
          title={t("calls.startVideo")}
          disabled={call.isActive || disabled}
          onClick={() => void call.startCall("video")}
          className={cn(
            "rounded-lg text-slate-600 hover:bg-[#3B5998]/10 hover:text-[#3B5998] disabled:opacity-40",
            compact ? "p-1.5 text-base" : "p-2 text-lg"
          )}
          aria-label={t("calls.startVideo")}
        >
          📹
        </button>
        <button
          type="button"
          title={t("calls.startAudio")}
          disabled={call.isActive || disabled}
          onClick={() => void call.startCall("audio")}
          className={cn(
            "rounded-lg text-slate-600 hover:bg-[#3B5998]/10 hover:text-[#3B5998] disabled:opacity-40",
            compact ? "p-1.5 text-base" : "p-2 text-lg"
          )}
          aria-label={t("calls.startAudio")}
        >
          🎙️
        </button>
      </div>

      <MeetingRoom
        open={call.isActive || call.status === "error"}
        status={call.status}
        mode={call.mode}
        peerLabel={peerLabel}
        error={call.error}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        isMuted={call.isMuted}
        isCameraOff={call.isCameraOff}
        onAccept={() => void call.acceptCall()}
        onReject={() => void call.rejectCall()}
        onEnd={() => void call.endCall()}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
      />
    </>
  );
}
