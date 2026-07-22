import { NextResponse } from "next/server";
import {
  getConversationForViewer,
  getMessages,
  sendMessage,
} from "@/lib/network/messaging-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { MessageAttachment } from "@/types/network";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const conversation = await getConversationForViewer(conversationId, auth.user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await getMessages(conversationId, auth.user.id);
  return NextResponse.json({ conversation, messages });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  try {
    const body = (await request.json()) as {
      content?: string;
      file?: MessageAttachment;
    };

    const message = await sendMessage(
      auth.user.id,
      conversationId,
      body.content?.trim() ?? "",
      body.file
    );

    if (!message) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 400 });
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
