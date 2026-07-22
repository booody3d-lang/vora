"use client";

import { useRef, useState } from "react";
import type { MessageAttachment } from "@/types/network";
import { MESSAGE_FILE_MIME_TYPES } from "@/lib/media/constants";
import { inferMediaType, uploadMediaFile } from "@/lib/media/upload-client";
import { useTranslations } from "@/i18n/use-translations";

interface MessageInputProps {
  onSend: (content: string, file?: MessageAttachment) => void | Promise<boolean | void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const { t } = useTranslations();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    if (!text.trim() || disabled || uploading) return;
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

  return (
    <div className="border-t border-slate-100 bg-white p-3">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
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
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#3B5998] disabled:opacity-40"
          title={t("network.messagingAttachTitle")}
        >
          {uploading ? "⏳" : "📎"}
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
          disabled={disabled || uploading}
          className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#3B5998] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || disabled || uploading}
          className="shrink-0 rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {uploading ? t("profileEdit.uploading") : t("network.messagingSend")}
        </button>
      </div>
    </div>
  );
}
