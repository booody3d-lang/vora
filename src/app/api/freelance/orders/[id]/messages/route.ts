import { NextResponse } from "next/server";
import {
  addMessageToOrder,
  getOrderForParticipant,
  isOrdersPersistenceActive,
} from "@/lib/freelance/orders-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function POST(
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
    const body = (await request.json()) as {
      content?: string;
      fileUrl?: string;
      fileName?: string;
      isSystem?: boolean;
      senderName?: string;
    };

    const access = await getOrderForParticipant(id, auth.user.id);
    if (!access) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const message = await addMessageToOrder(id, auth.user.id, {
      content: body.content,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      isSystem: body.isSystem,
      senderName: body.senderName ?? (access.isBuyer ? "You (Buyer)" : "You (Seller)"),
    });

    if (!message) {
      return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
    }

    return NextResponse.json({
      message,
      persistence: isOrdersPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}
