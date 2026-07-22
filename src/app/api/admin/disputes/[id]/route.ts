import { NextResponse } from "next/server";
import {
  getDisputeForAdmin,
  isDisputesPersistenceActive,
  resolveDisputeForAdmin,
} from "@/lib/admin/admin-disputes-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";
import type { DisputeStatus } from "@/types/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const { id } = await params;
  const dispute = await getDisputeForAdmin(id);
  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  return NextResponse.json({
    dispute,
    persistence: isDisputesPersistenceActive() ? "supabase" : "json",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: DisputeStatus };
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const dispute = await resolveDisputeForAdmin(id, body.status);
    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    return NextResponse.json({
      dispute,
      persistence: isDisputesPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
