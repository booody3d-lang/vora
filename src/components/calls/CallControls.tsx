"use client";

import { MeetingRoom } from "@/components/calls/MeetingRoom";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useTranslations } from "@/i18n/use-translations";
import { isVideoCallsEnabled, type CallContextType } from "@/lib/calls/config";
import { usePermissions } from "@/providers/VoraProviders";

interface CallControlsProps {
  contextType: CallContextType;
  contextId: string;
  localAccountId: string;
  peerLabel: string;
  disabled?: boolean;
}

export function CallControls({
  contextType,
  contextId,
  localAccountId,
  peerLabel,
  disabled = false,
}: CallControlsProps) {
  const { t } = useTranslations();
  const { role } = usePermissions();
  const enabled = isVideoCallsEnabled() && role !== "company" && !disabled;

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
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title={t("calls.startVideo")}
          disabled={call.isActive || disabled}
          onClick={() => void call.startCall("video")}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#3B5998] disabled:opacity-40"
          aria-label={t("calls.startVideo")}
        >
          📹
        </button>
        <button
          type="button"
          title={t("calls.startAudio")}
          disabled={call.isActive || disabled}
          onClick={() => void call.startCall("audio")}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#3B5998] disabled:opacity-40"
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
