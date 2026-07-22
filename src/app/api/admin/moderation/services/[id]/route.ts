import { NextResponse } from "next/server";
import {
  isAdminModerationPersistenceActive,
  removeServiceForAdmin,
  toggleServiceHiddenForAdmin,
} from "@/lib/admin/admin-moderation-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as { hidden?: boolean; remove?: boolean };

    let service = null;
    if (body.remove) {
      service = await removeServiceForAdmin(id);
    } else if (typeof body.hidden === "boolean") {
      service = await toggleServiceHiddenForAdmin(id, body.hidden);
    } else {
      return NextResponse.json({ error: "hidden or remove is required" }, { status: 400 });
    }

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({
      service,
      persistence: isAdminModerationPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
