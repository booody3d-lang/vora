import { NextResponse } from "next/server";
import {
  getConversationsForAccount,
  getOrCreateConversation,
} from "@/lib/network/messaging-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await getConversationsForAccount(auth.user.id);
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { targetAccountId?: string };
    if (!body.targetAccountId) {
      return NextResponse.json({ error: "targetAccountId required" }, { status: 400 });
    }

    const conv = await getOrCreateConversation(auth.user.id, body.targetAccountId);
    if (!conv) {
      return NextResponse.json(
        { error: "Messaging requires an accepted follow connection" },
        { status: 403 }
      );
    }

    const conversations = await getConversationsForAccount(auth.user.id);
    const preview = conversations.find((item) => item.id === conv.id);
    return NextResponse.json({ conversation: preview ?? { id: conv.id } });
  } catch {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
