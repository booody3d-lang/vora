import { NextResponse } from "next/server";
import {
  isAdminModerationPersistenceActive,
  removeStoreForAdmin,
  toggleStoreHiddenForAdmin,
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

    let store = null;
    if (body.remove) {
      store = await removeStoreForAdmin(id);
    } else if (typeof body.hidden === "boolean") {
      store = await toggleStoreHiddenForAdmin(id, body.hidden);
    } else {
      return NextResponse.json({ error: "hidden or remove is required" }, { status: 400 });
    }

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({
      store,
      persistence: isAdminModerationPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
