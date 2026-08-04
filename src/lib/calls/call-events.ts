export type CallEventKind =
  | "started"
  | "ended"
  | "missed"
  | "declined"
  | "cancelled"
  | "failed";

export type CallEventMode = "video" | "audio";

export interface CallChatEvent {
  v: 1;
  kind: CallEventKind;
  mode: CallEventMode;
  durationSec?: number;
  at: string;
}

const PREFIX = "__vora_call__:";

export function encodeCallEvent(event: Omit<CallChatEvent, "v" | "at"> & { at?: string }): string {
  const payload: CallChatEvent = {
    v: 1,
    kind: event.kind,
    mode: event.mode,
    durationSec: event.durationSec ?? 0,
    at: event.at ?? new Date().toISOString(),
  };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function parseCallEvent(content: string | undefined | null): CallChatEvent | null {
  if (!content?.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(PREFIX.length)) as CallChatEvent;
    if (raw?.v !== 1 || !raw.kind || !raw.mode) return null;
    return raw;
  } catch {
    return null;
  }
}

export function formatDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function callEventLabelKey(kind: CallEventKind): string {
  switch (kind) {
    case "started":
      return "calls.event.started";
    case "ended":
      return "calls.event.ended";
    case "missed":
      return "calls.event.missed";
    case "declined":
      return "calls.event.declined";
    case "cancelled":
      return "calls.event.cancelled";
    case "failed":
      return "calls.event.failed";
    default:
      return "calls.event.ended";
  }
}
