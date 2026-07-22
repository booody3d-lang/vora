import { NextResponse } from "next/server";
import {
  isAdminUsersPersistenceActive,
  listUsersForAdmin,
} from "@/lib/admin/admin-users-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const users = await listUsersForAdmin();
  return NextResponse.json({
    users,
    persistence: isAdminUsersPersistenceActive() ? "supabase" : "json",
  });
}
