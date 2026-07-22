import { NextResponse } from "next/server";
import {
  getAdminSecuritySnapshot,
  isAdminSecurityPersistenceActive,
} from "@/lib/admin/admin-security-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const snapshot = await getAdminSecuritySnapshot();
  return NextResponse.json({
    ...snapshot,
    persistence: isAdminSecurityPersistenceActive() ? "supabase" : "demo",
  });
}
