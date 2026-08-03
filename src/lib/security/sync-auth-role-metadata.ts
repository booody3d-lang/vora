import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { VoraRole } from "@/types/security";

export interface AuthNavMetadata {
  profileSlug?: string | null;
  storeSlug?: string | null;
}

/** Keep JWT metadata aligned with DB role so Edge middleware can resolve admin/owner without service-role REST. */
export async function syncAuthUserRoleMetadata(userId: string, role: VoraRole): Promise<void> {
  if (!isAdminClientAvailable()) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role },
      user_metadata: { role },
    });
    if (error) {
      console.error("[auth] syncAuthUserRoleMetadata failed:", error.message);
    }
  } catch (err) {
    console.error(
      "[auth] syncAuthUserRoleMetadata failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** Persist profile/store slugs in auth metadata when production `profiles` lacks a slug column. */
export async function syncAuthUserNavMetadata(
  userId: string,
  metadata: AuthNavMetadata
): Promise<void> {
  if (!isAdminClientAvailable()) return;

  try {
    const admin = createAdminClient();
    const patch: Record<string, string | null | undefined> = {};
    if (metadata.profileSlug !== undefined) patch.profile_slug = metadata.profileSlug;
    if (metadata.storeSlug !== undefined) patch.store_slug = metadata.storeSlug;
    if (Object.keys(patch).length === 0) return;

    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: patch,
      app_metadata: patch,
    });
    if (error) {
      console.error("[auth] syncAuthUserNavMetadata failed:", error.message);
    }
  } catch (err) {
    console.error(
      "[auth] syncAuthUserNavMetadata failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function fetchAuthNavMetadata(userId: string): Promise<AuthNavMetadata | null> {
  if (!isAdminClientAvailable()) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return null;

    const meta = { ...data.user.app_metadata, ...data.user.user_metadata } as Record<
      string,
      unknown
    >;
    return {
      profileSlug: typeof meta.profile_slug === "string" ? meta.profile_slug : null,
      storeSlug: typeof meta.store_slug === "string" ? meta.store_slug : null,
    };
  } catch {
    return null;
  }
}
