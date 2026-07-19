import { NextResponse } from "next/server";
import {
  getOnlineStatus,
  touchPresence,
} from "@/lib/network/presence-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  touchPresence(auth.user.id);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  touchPresence(auth.user.id);

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  const online = getOnlineStatus(ids);

  return NextResponse.json({ online });
}
