import { NextResponse } from "next/server";
import {
  createProfileForAccount,
  getProfileByAccountId,
} from "@/lib/profile/profile-store";
import { updateCompanyForAccount } from "@/lib/company/company-store";
import {
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_SHORT_VIDEO_SECONDS,
  MAX_UPLOAD_BYTES,
  MAX_VOICE_MESSAGE_SECONDS,
} from "@/lib/media/constants";
import { processAvatarImage, processFeedImage } from "@/lib/media/process-image";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { AuthUser } from "@/types/security";
import {
  saveProfileForAccount,
  saveStoreForAccount,
} from "@/lib/supabase/profile-persistence";
import { uploadProfileMedia } from "@/lib/supabase/media-storage";
import {
  canBypassFeatureChecks,
  forbidUploadWithoutAccess,
  recordGatedUpload,
} from "@/lib/security/feature-guard";
import type { ProfileUploadKind } from "@/types/profile";

const AVATAR_KINDS: ProfileUploadKind[] = ["photo", "store-logo", "company-logo"];
const COVER_KINDS: ProfileUploadKind[] = ["cover", "store-cover", "company-cover"];
const MEDIA_KINDS: ProfileUploadKind[] = ["post-media", "message-attachment", "video-intro"];

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } {
  // Supports mime params from MediaRecorder, e.g. data:audio/webm;codecs=opus;base64,...
  const match = dataUrl.match(/^data:([^,]*?);base64,([\s\S]+)$/);
  if (!match) throw new Error("Invalid image data format");
  const mime = (match[1].split(";")[0] || "application/octet-stream").trim();
  return {
    mime,
    buffer: Buffer.from(match[2], "base64"),
  };
}

function isImageMime(mime: string) {
  return mime.startsWith("image/") && mime !== "image/svg+xml";
}

function isVideoMime(mime: string) {
  return mime.startsWith("video/");
}

function isAudioMime(mime: string) {
  return mime.startsWith("audio/");
}

function videoExtension(mime: string) {
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return "mp4";
}

function audioExtension(mime: string) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime === "audio/mp3") return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("aac")) return "aac";
  return "m4a";
}

function ensureOwnerProfile(accountId: string, authUser: AuthUser) {
  if (getProfileByAccountId(accountId)) return;
  createProfileForAccount({
    accountId,
    fullName: authUser.fullName,
    email: authUser.email,
    role: authUser.role,
    gender: authUser.gender,
    hasFreelancerStore: authUser.hasFreelancerStore,
  });
}

async function processUploadInput(input: {
  kind: ProfileUploadKind;
  buffer: Buffer;
  mime: string;
  filename?: string;
  durationSeconds?: number;
  accountId: string;
  authUser: AuthUser;
}) {
  if (input.buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("File must be under 25MB");
  }

  let buffer = input.buffer;
  let ext = "bin";
  let width = 0;
  let height = 0;
  let outMime = input.mime;
  const { kind, durationSeconds } = input;

  if (isVideoMime(input.mime)) {
    if (!MEDIA_KINDS.includes(kind)) {
      throw new Error("Video upload not allowed for this field");
    }
    if (!durationSeconds || durationSeconds <= 0) {
      throw new Error("Video duration is required");
    }
    if (durationSeconds > MAX_SHORT_VIDEO_SECONDS) {
      throw new Error(`Video must be ${MAX_SHORT_VIDEO_SECONDS} seconds or less`);
    }
    ext = videoExtension(input.mime);
    outMime = input.mime;
  } else if (isAudioMime(input.mime)) {
    if (kind !== "message-attachment") {
      throw new Error("Audio upload is only allowed for chat voice messages");
    }
    const baseMime = input.mime.split(";")[0]?.trim() || input.mime;
    if (!(AUDIO_MIME_TYPES as readonly string[]).includes(baseMime)) {
      throw new Error("Unsupported audio type");
    }
    if (durationSeconds && durationSeconds > MAX_VOICE_MESSAGE_SECONDS) {
      throw new Error(`Voice messages must be ${MAX_VOICE_MESSAGE_SECONDS} seconds or less`);
    }
    ext = audioExtension(baseMime);
    outMime = baseMime;
  } else if (isImageMime(input.mime)) {
    if (!IMAGE_MIME_TYPES.includes(input.mime as (typeof IMAGE_MIME_TYPES)[number])) {
      throw new Error("Unsupported image type. Use JPEG, PNG, GIF, or WebP");
    }
    if (AVATAR_KINDS.includes(kind)) {
      const processed = await processAvatarImage(buffer);
      buffer = processed.buffer;
      ext = processed.ext;
      width = processed.width;
      height = processed.height;
      outMime = processed.mimeType;
    } else if (MEDIA_KINDS.includes(kind) || COVER_KINDS.includes(kind)) {
      const processed = await processFeedImage(buffer, {
        maxDimension: COVER_KINDS.includes(kind) ? 2400 : 1920,
      });
      buffer = processed.buffer;
      ext = processed.ext;
      width = processed.width;
      height = processed.height;
      outMime = processed.mimeType;
    } else {
      const processed = await processFeedImage(buffer);
      buffer = processed.buffer;
      ext = processed.ext;
      width = processed.width;
      height = processed.height;
      outMime = processed.mimeType;
    }
  } else if (input.mime === "application/pdf") {
    if (kind !== "resume") {
      throw new Error("PDF uploads are only allowed for resumes");
    }
    ext = "pdf";
  } else {
    throw new Error("Unsupported file type");
  }

  const filename =
    input.filename?.replace(/[^\w.-]/g, "_") ?? `${kind}-${Date.now()}.${ext}`;

  ensureOwnerProfile(input.accountId, input.authUser);
  const url = await uploadProfileMedia(input.accountId, filename, buffer, outMime);

  if (kind === "photo") {
    await saveProfileForAccount(input.accountId, { profilePhotoUrl: url });
  } else if (kind === "cover") {
    await saveProfileForAccount(input.accountId, { coverImageUrl: url });
  } else if (kind === "resume") {
    await saveProfileForAccount(input.accountId, { resumeUrl: url });
  } else if (kind === "store-logo") {
    await saveStoreForAccount(input.accountId, { logoUrl: url });
  } else if (kind === "store-cover") {
    await saveStoreForAccount(input.accountId, { coverImageUrl: url });
  } else if (kind === "company-logo") {
    await updateCompanyForAccount(input.accountId, { logoUrl: url });
  } else if (kind === "company-cover") {
    await updateCompanyForAccount(input.accountId, { coverImageUrl: url });
  } else if (kind === "video-intro") {
    await saveProfileForAccount(input.accountId, { videoIntroUrl: url });
  }

  return { url, width, height, mimeType: outMime, durationSeconds };
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const kind = form.get("kind") as ProfileUploadKind | null;
      const file = form.get("file");

      if (!kind || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing kind or file in upload" }, { status: 400 });
      }

      const uploadDenied = await forbidUploadWithoutAccess(auth.user, kind);
      if (uploadDenied) return uploadDenied;

      const durationRaw = form.get("durationSeconds");
      const durationSeconds = durationRaw ? Number(durationRaw) : undefined;
      const buffer = Buffer.from(await file.arrayBuffer());

      const result = await processUploadInput({
        kind,
        buffer,
        mime: file.type || "application/octet-stream",
        filename: file.name,
        durationSeconds,
        accountId: auth.user.id,
        authUser: auth.user,
      });

      if (!canBypassFeatureChecks(auth.user)) {
        recordGatedUpload(auth.user.id, kind);
      }

      return NextResponse.json(result);
    }

    const body = (await request.json()) as {
      kind: ProfileUploadKind;
      dataUrl: string;
      filename?: string;
      durationSeconds?: number;
    };

    if (!body.kind || !body.dataUrl) {
      return NextResponse.json({ error: "Missing upload data" }, { status: 400 });
    }

    const uploadDenied = await forbidUploadWithoutAccess(auth.user, body.kind);
    if (uploadDenied) return uploadDenied;

    const { buffer, mime } = parseDataUrl(body.dataUrl);
    const result = await processUploadInput({
      kind: body.kind,
      buffer,
      mime,
      filename: body.filename,
      durationSeconds: body.durationSeconds,
      accountId: auth.user.id,
      authUser: auth.user,
    });

    if (!canBypassFeatureChecks(auth.user)) {
      recordGatedUpload(auth.user.id, body.kind);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[profile/upload]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
