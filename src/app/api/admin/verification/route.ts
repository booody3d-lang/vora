import { NextResponse } from "next/server";
import {
  isAdminVerificationPersistenceActive,
  listVerificationQueueForAdmin,
} from "@/lib/admin/admin-verification-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const queue = await listVerificationQueueForAdmin();
  return NextResponse.json({
    queue,
    persistence: isAdminVerificationPersistenceActive() ? "supabase" : "json",
  });
}
