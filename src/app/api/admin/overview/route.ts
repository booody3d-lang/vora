import { NextResponse } from "next/server";
import { getAdminOverviewSnapshot } from "@/lib/admin/admin-overview-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const snapshot = await getAdminOverviewSnapshot();
  return NextResponse.json(snapshot);
}
