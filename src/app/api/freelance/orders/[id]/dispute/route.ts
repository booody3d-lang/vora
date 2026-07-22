import { NextResponse } from "next/server";
import { isDisputesPersistenceActive, openDisputeForOrder } from "@/lib/admin/admin-disputes-store";
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
    const { id: orderId } = await params;
    const body = (await request.json()) as {
      reason?: string;
      orderNumber?: string;
      serviceTitle?: string;
      sellerName?: string;
      amount?: number;
    };

    const ticket = await openDisputeForOrder(orderId, auth.user.id, body.reason ?? "", {
      orderNumber: body.orderNumber ?? orderId,
      serviceTitle: body.serviceTitle ?? "Service",
      buyerName: auth.user.fullName ?? auth.user.email,
      sellerName: body.sellerName ?? "Seller",
      amount: body.amount ?? 0,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 });
    }

    return NextResponse.json({
      dispute: ticket,
      persistence: isDisputesPersistenceActive() ? "supabase" : "json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open dispute";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
