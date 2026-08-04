export const MAX_SHORT_VIDEO_SECONDS = 15;
export const MAX_VOICE_MESSAGE_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/aac",
  "audio/wav",
  "audio/x-m4a",
  "audio/m4a",
] as const;

export const MESSAGE_FILE_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
