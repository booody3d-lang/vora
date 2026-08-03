import type { User } from "@supabase/supabase-js";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import {
  fetchAccountRoleByIdEdge,
  resolveRoleFromAuthMetadata,
} from "@/lib/security/resolve-account-role-edge";
import { parseVoraRole } from "@/lib/security/parse-vora-role";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";

export {
  fetchAccountRoleByIdEdge,
  isElevatedRole,
  resolveRoleFromAuthMetadata,
} from "@/lib/security/resolve-account-role-edge";

/** Read role from accounts — REST first (Edge-safe), Supabase client fallback on Node. */
export async function fetchAccountRoleById(accountId: string): Promise<VoraRole | null> {
  const fromRest = await fetchAccountRoleByIdEdge(accountId);
  if (fromRest) return fromRest;

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

export function resolveRoleFromSupabaseUser(user: User): VoraRole {
  return resolveRoleFromAuthMetadata(user);
}

export function resolveEffectiveRoleFromUser(user: User, dbRole?: VoraRole | null): VoraRole {
  const email = user.email ?? "";
  if (dbRole) {
    return resolveEffectiveRole({ email, role: dbRole });
  }
  return resolveRoleFromAuthMetadata(user);
}
