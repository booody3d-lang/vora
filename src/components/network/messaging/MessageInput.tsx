"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageAttachment } from "@/types/network";
import { MAX_VOICE_MESSAGE_SECONDS, MESSAGE_FILE_MIME_TYPES } from "@/lib/media/constants";
import {
  getAudioDurationSeconds,
  inferMediaType,
  pickVoiceRecorderMimeType,
  uploadMediaFile,
} from "@/lib/media/upload-client";
import { useTranslations } from "@/i18n/use-translations";
import { formatDuration } from "@/lib/calls/call-events";
import { IconAttach, IconMic, IconClose, IconSend } from "@/components/calls/CallIcons";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string, file?: MessageAttachment) => void | Promise<boolean | void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const { t } = useTranslations();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleSend() {
    if (!text.trim() || disabled || uploading || recording) return;
    await onSend(text.trim());
    setText("");
    setError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    if (!MESSAGE_FILE_MIME_TYPES.includes(file.type as (typeof MESSAGE_FILE_MIME_TYPES)[number])) {
      setError(t("network.messagingUnsupportedFile"));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploaded = await uploadMediaFile(file, "message-attachment");
      const attachment: MessageAttachment = {
        url: uploaded.url,
        name: file.name,
        size: file.size,
        mimeType: uploaded.mimeType,
        mediaType: inferMediaType(uploaded.mimeType, file.name),
        durationSeconds: uploaded.durationSeconds,
      };
      await onSend(text.trim(), attachment);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function startRecording() {
    if (disabled || uploading || recording) return;
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("network.messagingVoiceUnsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickVoiceRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setRecordSec(0);
      setRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setRecordSec(elapsed);
        if (elapsed >= MAX_VOICE_MESSAGE_SECONDS) {
          void finishRecording(true);
        }
      }, 250);

      recorder.start(200);
    } catch {
      stopTracks();
      setRecording(false);
      setError(t("network.messagingVoicePermission"));
    }
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    clearTimer();
    setRecording(false);
    setRecordSec(0);
  }

  async function finishRecording(send: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cancelRecording();
      return;
    }

    clearTimer();
    setRecording(false);

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type }));
      };
      recorder.stop();
    });

    stopTracks();
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (!send || !blob || blob.size < 256) {
      setRecordSec(0);
      return;
    }

    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setUploading(true);
    setError(null);

    try {
      const ext = blob.type.includes("mp4") || blob.type.includes("aac") ? "m4a" : "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, {
        type: blob.type || "audio/webm",
      });
      const durationSeconds =
        (await getAudioDurationSeconds(file)) ?? Math.min(elapsed, MAX_VOICE_MESSAGE_SECONDS);

      if (durationSeconds > MAX_VOICE_MESSAGE_SECONDS) {
        throw new Error(t("network.messagingVoiceTooLong"));
      }

      const uploaded = await uploadMediaFile(file, "message-attachment", {
        validateVideo: false,
      });
      const attachment: MessageAttachment = {
        url: uploaded.url,
        name: file.name,
        size: file.size,
        mimeType: uploaded.mimeType ?? file.type,
        mediaType: "audio",
        durationSeconds: uploaded.durationSeconds ?? durationSeconds,
      };
      await onSend("", attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      setUploading(false);
      setRecordSec(0);
    }
  }

  const busy = disabled || uploading;

  return (
    <div className="border-t border-slate-100 bg-white p-3">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      {recording ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <p className="flex-1 font-mono text-sm font-semibold text-red-600">
            {formatDuration(recordSec)}
          </p>
          <button
            type="button"
            onClick={cancelRecording}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-white"
            aria-label={t("network.messagingVoiceCancel")}
            title={t("network.messagingVoiceCancel")}
          >
            <IconClose size={18} />
          </button>
          <button
            type="button"
            onClick={() => void finishRecording(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#3B5998] px-3 text-sm font-semibold text-white"
          >
            <IconSend size={16} />
            {t("network.messagingSend")}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={MESSAGE_FILE_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#3B5998] disabled:opacity-40"
            title={t("network.messagingAttachTitle")}
            aria-label={t("network.messagingAttachTitle")}
          >
            {uploading ? (
              <span className="text-xs">…</span>
            ) : (
              <IconAttach size={20} />
            )}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={t("network.messagingInputPlaceholder")}
            dir="auto"
            rows={1}
            disabled={busy}
            className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#3B5998] disabled:opacity-50"
          />
          {text.trim() ? (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#3B5998] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {uploading ? t("profileEdit.uploading") : t("network.messagingSend")}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startRecording()}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3B5998] text-white transition hover:bg-[#334f88] disabled:opacity-40"
              )}
              title={t("network.messagingVoiceTitle")}
              aria-label={t("network.messagingVoiceTitle")}
            >
              <IconMic size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
