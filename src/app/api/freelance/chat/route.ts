import { NextResponse } from "next/server";
import {
  isChatPersistenceActive,
  listChatSessionsForAccount,
  listInquiriesForSeller,
} from "@/lib/freelance/chat-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const [sessions, inquiries] = await Promise.all([
    listChatSessionsForAccount(auth.user.id),
    listInquiriesForSeller(auth.user.id),
  ]);

  return NextResponse.json({
    sessions,
    inquiries,
    persistence: isChatPersistenceActive() ? "supabase" : "json",
  });
}
