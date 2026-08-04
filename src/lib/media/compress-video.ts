import { MAX_SHORT_VIDEO_SECONDS } from "@/lib/media/constants";
import { getVideoDuration } from "@/lib/media/video-client";

const TARGET_WIDTH = 720;
const TARGET_BITRATE = 1_200_000;

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/**
 * Re-encode short videos client-side to reduce bandwidth while keeping quality usable.
 * Falls back to the original file when compression is unsupported or fails.
 */
export async function compressShortVideo(file: File): Promise<{
  file: File;
  durationSeconds: number;
  compressed: boolean;
}> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Not a video file");
  }

  const durationSeconds = await getVideoDuration(file);
  if (durationSeconds <= 0) throw new Error("Could not determine video duration");
  if (durationSeconds > MAX_SHORT_VIDEO_SECONDS) {
    throw new Error(`Video must be ${MAX_SHORT_VIDEO_SECONDS} seconds or less`);
  }

  // Small enough already — skip re-encode.
  if (file.size <= 2.5 * 1024 * 1024) {
    return { file, durationSeconds, compressed: false };
  }

  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    return { file, durationSeconds, compressed: false };
  }

  const mimeType = pickRecorderMime();
  if (!mimeType) return { file, durationSeconds, compressed: false };

  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video for compression"));
    });

    const scale = Math.min(1, TARGET_WIDTH / (video.videoWidth || TARGET_WIDTH));
    const width = Math.max(2, Math.round((video.videoWidth || TARGET_WIDTH) * scale / 2) * 2);
    const height = Math.max(2, Math.round((video.videoHeight || 1280) * scale / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return { file, durationSeconds, compressed: false };
    }

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: TARGET_BITRATE,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
      recorder.onerror = () => reject(new Error("Video compression failed"));
    });

    recorder.start(200);
    await video.play();

    const draw = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(draw);
    };
    draw();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    URL.revokeObjectURL(url);

    const blob = await recorded;
    if (!blob.size || blob.size >= file.size) {
      return { file, durationSeconds, compressed: false };
    }

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, "") + `-compressed.${ext}`,
      { type: blob.type || "video/webm", lastModified: Date.now() }
    );
    return { file: compressedFile, durationSeconds, compressed: true };
  } catch {
    return { file, durationSeconds, compressed: false };
  }
}
