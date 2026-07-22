import { NextResponse } from "next/server";
import {
  isDisputesPersistenceActive,
  listDisputesForAdmin,
} from "@/lib/admin/admin-disputes-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const disputes = await listDisputesForAdmin();
  return NextResponse.json({
    disputes,
    persistence: isDisputesPersistenceActive() ? "supabase" : "json",
  });
}
