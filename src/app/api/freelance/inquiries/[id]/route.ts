import { NextResponse } from "next/server";
import { isChatPersistenceActive, respondToInquiry } from "@/lib/freelance/chat-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseProfileAndStore(auth.user);
    const { id } = await params;
    const body = (await request.json()) as { status?: "accepted" | "declined" };
    if (body.status !== "accepted" && body.status !== "declined") {
      return NextResponse.json({ error: "status must be accepted or declined" }, { status: 400 });
    }

    const inquiry = await respondToInquiry(id, auth.user.id, body.status);
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ inquiry, persistence: isChatPersistenceActive() ? "supabase" : "json" });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
