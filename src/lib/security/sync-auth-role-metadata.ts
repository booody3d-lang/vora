import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { VoraRole } from "@/types/security";

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
