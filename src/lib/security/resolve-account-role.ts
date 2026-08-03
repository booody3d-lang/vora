import type { User } from "@supabase/supabase-js";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { parseVoraRole } from "@/lib/security/parse-vora-role";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";

/** Read role from accounts via service role — same source as server session resolution. */
export async function fetchAccountRoleById(accountId: string): Promise<VoraRole | null> {
  if (!isAdminClientAvailable()) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("accounts")
      .select("account_type, primary_role")
      .eq("id", accountId)
      .maybeSingle();

    if (error || !data) return null;

    const fromAccountType = parseVoraRole(data.account_type);
    if (fromAccountType) return fromAccountType;

    return parseVoraRole(data.primary_role);
  } catch {
    return null;
  }
}

export function resolveRoleFromAuthMetadata(user: User): VoraRole {
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};
  const role = parseVoraRole(meta.role ?? appMeta.role) ?? "registered";
  return resolveEffectiveRole({ email: user.email ?? "", role });
}

export function isElevatedRole(role: VoraRole): boolean {
  return role === "admin" || role === "owner" || role === "company";
}
