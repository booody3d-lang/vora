import { parseVoraRole } from "@/lib/security/parse-vora-role";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";
import type { User } from "@supabase/supabase-js";

interface AccountRoleRow {
  account_type?: string | null;
  primary_role?: string | null;
}

/** Edge-safe account role lookup via Supabase REST (no Supabase JS client). */
export async function fetchAccountRoleByIdEdge(accountId: string): Promise<VoraRole | null> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceRoleKey || !supabaseUrl) return null;

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/accounts`);
    url.searchParams.set("select", "account_type,primary_role");
    url.searchParams.set("id", `eq.${accountId}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const rows = (await res.json()) as AccountRoleRow[];
    const row = rows[0];
    if (!row) return null;

    return parseVoraRole(row.account_type) ?? parseVoraRole(row.primary_role);
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
