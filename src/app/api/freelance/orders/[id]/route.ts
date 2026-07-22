import { NextResponse } from "next/server";
import {
  getOrderForParticipant,
  isOrdersPersistenceActive,
  updateOrderForParticipant,
} from "@/lib/freelance/orders-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";
import type { OrderStatus } from "@/types/freelance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  const { id } = await params;

  const result = await getOrderForParticipant(id, auth?.user.id ?? null);
  if (!result) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isDemoOrder = id === "ord-1" || id === "ord-new";
  if (!isDemoOrder) {
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = result.order.buyerId === auth.user.id || result.order.sellerId === auth.user.id;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    ...result,
    persistence: isOrdersPersistenceActive() ? "supabase" : "json",
  });
}

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
    const body = (await request.json()) as {
      status?: OrderStatus;
      requirementsText?: string;
      requirementsFiles?: string[];
      deliveryFiles?: string[];
      revisionsRemaining?: number;
      escrowReleased?: boolean;
    };

    const order = await updateOrderForParticipant(id, auth.user.id, body);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      order,
      persistence: isOrdersPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
