import { NextResponse } from "next/server";
import {
  isAdminVerificationPersistenceActive,
  updateVerificationStatusForAdmin,
} from "@/lib/admin/admin-verification-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";
import type { VerificationStatus } from "@/types/admin";

const ALLOWED_STATUSES = new Set<VerificationStatus>(["approved", "rejected"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: VerificationStatus };

    if (!body.status || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
    }

    const application = await updateVerificationStatusForAdmin(id, body.status);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({
      application,
      persistence: isAdminVerificationPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
