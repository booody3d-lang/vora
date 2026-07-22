import { NextResponse } from "next/server";
import { completeOrderEscrow, createMarketplaceInvoice } from "@/lib/billing/wallet-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id: orderId } = await params;
    const body = (await request.json()) as {
      sellerId: string;
      total: number;
      serviceTitle?: string;
      buyerName?: string;
    };

    if (!body.sellerId || !body.total || body.total <= 0) {
      return NextResponse.json({ error: "sellerId and total are required" }, { status: 400 });
    }

    const split = await completeOrderEscrow(orderId, body.sellerId, body.total);

    let invoice = null;
    if (body.serviceTitle && body.buyerName) {
      invoice = await createMarketplaceInvoice(authResult.auth.user.id, {
        orderTotal: body.total,
        serviceTitle: body.serviceTitle,
        buyerName: body.buyerName,
      });
    }

    return NextResponse.json({ success: true, split, invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
