import { MAX_SHORT_VIDEO_SECONDS } from "@/lib/media/constants";

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };

    video.src = url;
  });
}

export async function validateShortVideo(file: File): Promise<number> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Not a video file");
  }

  const duration = await getVideoDuration(file);
  if (duration <= 0) {
    throw new Error("Could not determine video duration");
  }
  if (duration > MAX_SHORT_VIDEO_SECONDS) {
    throw new Error(`Video must be ${MAX_SHORT_VIDEO_SECONDS} seconds or less`);
  }
  return duration;
}
