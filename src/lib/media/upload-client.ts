import type { ProfileUploadKind } from "@/types/profile";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { validateShortVideo } from "@/lib/media/video-client";

export interface UploadedMedia {
  url: string;
  width?: number;
  height?: number;
  mimeType?: string;
  durationSeconds?: number;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function normalizeUploadFile(file: File): File {
  const baseMime = file.type.split(";")[0]?.trim() || file.type;
  if (!baseMime || baseMime === file.type) return file;
  return new File([file], file.name, { type: baseMime, lastModified: file.lastModified });
}

export async function uploadMediaFile(
  file: File,
  kind: ProfileUploadKind,
  options?: { validateVideo?: boolean }
): Promise<UploadedMedia> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File must be under 25MB");
  }

  const uploadFile = normalizeUploadFile(file);

  let durationSeconds: number | undefined;
  if (uploadFile.type.startsWith("video/") && options?.validateVideo !== false) {
    durationSeconds = await validateShortVideo(uploadFile);
  } else if (uploadFile.type.startsWith("audio/")) {
    durationSeconds = await getAudioDurationSeconds(uploadFile);
  }

  // Voice notes: multipart avoids brittle data-URL mime params from MediaRecorder.
  if (uploadFile.type.startsWith("audio/")) {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", uploadFile, uploadFile.name);
    if (durationSeconds != null) {
      form.append("durationSeconds", String(durationSeconds));
    }
    const res = await fetch("/api/profile/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data.error as string) ?? "Upload failed");
    }
    return {
      url: data.url as string,
      width: Number(data.width) || undefined,
      height: Number(data.height) || undefined,
      mimeType: data.mimeType as string | undefined,
      durationSeconds: (data.durationSeconds as number | undefined) ?? durationSeconds,
    };
  }

  const dataUrl = await fileToDataUrl(uploadFile);
  const res = await fetch("/api/profile/upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      dataUrl,
      filename: `${kind}-${Date.now()}.${uploadFile.name.split(".").pop() ?? "bin"}`,
      durationSeconds,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) ?? "Upload failed");
  }

  return {
    url: data.url as string,
    width: Number(data.width) || undefined,
    height: Number(data.height) || undefined,
    mimeType: data.mimeType as string | undefined,
    durationSeconds: (data.durationSeconds as number | undefined) ?? durationSeconds,
  };
}

export function inferMediaType(
  mimeType?: string,
  fileName?: string
): "image" | "video" | "audio" | "file" {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  const lower = fileName?.toLowerCase() ?? "";
  if (/\.(jpe?g|png|gif|webp)$/.test(lower)) return "image";
  if (/\.(mp4|webm|mov)$/.test(lower)) return "video";
  if (/\.(webm|mp3|m4a|aac|ogg|wav|mpeg)$/.test(lower)) return "audio";
  return "file";
}

export function pickVoiceRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export async function getAudioDurationSeconds(file: Blob): Promise<number | undefined> {
  if (typeof window === "undefined") return undefined;
  const url = URL.createObjectURL(file);
  try {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error("Could not read audio duration"));
    });
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return undefined;
    return duration;
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}
