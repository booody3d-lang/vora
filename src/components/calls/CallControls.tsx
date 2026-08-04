"use client";

import { isVideoCallsEnabled, type CallContextType } from "@/lib/calls/config";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useCallOptional } from "@/providers/CallProvider";
import { usePermissions } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  contextType: CallContextType;
  contextId: string;
  localAccountId: string;
  peerAccountId: string;
  peerLabel: string;
  disabled?: boolean;
  compact?: boolean;
}

export function CallControls({
  contextType,
  contextId,
  localAccountId,
  peerAccountId,
  peerLabel,
  disabled = false,
  compact = false,
}: CallControlsProps) {
  const { t } = useTranslations();
  const { role } = usePermissions();
  const { fullName } = useCurrentProfile();
  const call = useCallOptional();
  const enabled =
    isVideoCallsEnabled() &&
    role !== "company" &&
    Boolean(localAccountId) &&
    Boolean(peerAccountId) &&
    Boolean(call) &&
    !disabled;

  if (!enabled || !call) return null;

  const busy = call.isActive || call.status === "summary";

  function begin(mode: "video" | "audio") {
    void call!.startCall({
      contextType,
      contextId,
      peerAccountId,
      peerLabel,
      mode,
      fromName: fullName || undefined,
    });
  }

  return (
    <div className={cn("flex shrink-0 items-center", compact ? "gap-0.5" : "gap-1")}>
      <button
        type="button"
        title={t("calls.startVideo")}
        disabled={busy}
        onClick={() => begin("video")}
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
        disabled={busy}
        onClick={() => begin("audio")}
        className={cn(
          "rounded-lg text-slate-600 hover:bg-[#3B5998]/10 hover:text-[#3B5998] disabled:opacity-40",
          compact ? "p-1.5 text-base" : "p-2 text-lg"
        )}
        aria-label={t("calls.startAudio")}
      >
        🎙️
      </button>
    </div>
  );
}
