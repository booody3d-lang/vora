import { NextResponse } from "next/server";
import {
  banUserForAdmin,
  isAdminUsersPersistenceActive,
  unbanUserForAdmin,
  updateUserRoleForAdmin,
} from "@/lib/admin/admin-users-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";
import type { BanType, UserAccountRole } from "@/types/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      role?: UserAccountRole;
      ban?: { type: BanType; reason: string };
      unban?: boolean;
    };

    let user = null;

    if (body.role) {
      user = await updateUserRoleForAdmin(id, body.role);
    } else if (body.ban?.reason?.trim()) {
      user = await banUserForAdmin(id, body.ban.type, body.ban.reason);
    } else if (body.unban) {
      user = await unbanUserForAdmin(id);
    } else {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user,
      persistence: isAdminUsersPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
