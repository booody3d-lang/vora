import "server-only";

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { canAccessAdminPanel } from "@/lib/security/roles";
import type { AuthUser } from "@/types/security";

export async function requireAuthenticatedApiUser(): Promise<
  { auth: { user: AuthUser } } | { response: NextResponse }
> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { auth: { user: auth.user } };
}

export async function requireAdminApiUser(): Promise<
  { auth: { user: AuthUser } } | { response: NextResponse }
> {
  const result = await requireAuthenticatedApiUser();
  if ("response" in result) return result;

  if (!canAccessAdminPanel(result.auth.user)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return result;
}
