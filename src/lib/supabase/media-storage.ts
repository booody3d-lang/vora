import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { saveUploadedFile } from "@/lib/profile/profile-store";

const BUCKET = "vora-uploads";

export function isSupabaseStorageEnabled(): boolean {
  return isSupabaseConfigured() && isAdminClientAvailable();
}

export async function uploadProfileMedia(
  accountId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!isSupabaseStorageEnabled()) {
    return saveUploadedFile(accountId, filename, buffer);
  }

  const admin = createAdminClient();
  const objectPath = `${accountId}/${filename}`;

  const { error } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    console.error("[media-storage] upload failed:", error.message);
    return saveUploadedFile(accountId, filename, buffer);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl || `${getSupabaseUrl()}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export async function readProfileMedia(
  accountId: string,
  filename: string
): Promise<Buffer | null> {
  if (!isSupabaseStorageEnabled()) {
    const { readUploadedFile } = await import("@/lib/profile/profile-store");
    return readUploadedFile(accountId, filename);
  }

  const admin = createAdminClient();
  const objectPath = `${accountId}/${filename}`;
  const { data, error } = await admin.storage.from(BUCKET).download(objectPath);

  if (error || !data) {
    const { readUploadedFile } = await import("@/lib/profile/profile-store");
    return readUploadedFile(accountId, filename);
  }

  return Buffer.from(await data.arrayBuffer());
}
