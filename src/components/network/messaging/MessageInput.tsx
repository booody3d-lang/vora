"use client";

import { useRef, useState } from "react";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface MessageInputProps {
  onSend: (content: string, file?: { url: string; name: string; size: number }) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be under 25MB");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Supported: Images, PDF, and Word documents");
      return;
    }

    const url = URL.createObjectURL(file);
    onSend("", { url, name: file.name, size: file.size });
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="border-t border-slate-100 p-3">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#3B5998]"
          title="Attach file (max 25MB)"
        >
          📎
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message..."
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="shrink-0 rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
