import { NextResponse } from "next/server";
import {
  isChatPersistenceActive,
  listMessagesForSession,
  sendMessageToSession,
} from "@/lib/freelance/chat-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const messages = await listMessagesForSession(sessionId, auth.user.id);
  return NextResponse.json({ messages, persistence: isChatPersistenceActive() ? "supabase" : "json" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseProfileAndStore(auth.user);
    const { sessionId } = await params;
    const body = (await request.json()) as { content?: string };
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const message = await sendMessageToSession(sessionId, auth.user.id, body.content.trim());
    if (!message) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message, persistence: isChatPersistenceActive() ? "supabase" : "json" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
