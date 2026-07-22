import { NextResponse } from "next/server";
import {
  getAdminModerationSnapshot,
  isAdminModerationPersistenceActive,
} from "@/lib/admin/admin-moderation-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const snapshot = await getAdminModerationSnapshot();
  return NextResponse.json({
    ...snapshot,
    persistence: isAdminModerationPersistenceActive() ? snapshot.persistence : "json",
  });
}
