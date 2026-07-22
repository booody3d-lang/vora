import { NextResponse } from "next/server";
import { createMarketplaceInvoice, lockOrderEscrowPayment } from "@/lib/billing/wallet-store";
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
      orderNumber?: string;
    };

    if (!body.sellerId || !body.total || body.total <= 0) {
      return NextResponse.json({ error: "sellerId and total are required" }, { status: 400 });
    }

    const description = body.serviceTitle
      ? `Order ${body.orderNumber ?? orderId} — ${body.serviceTitle}`
      : `Order escrow payment — ${body.orderNumber ?? orderId}`;

    const escrow = await lockOrderEscrowPayment(
      orderId,
      body.sellerId,
      authResult.auth.user.id,
      body.total,
      description
    );

    let invoice = null;
    if (body.serviceTitle) {
      invoice = await createMarketplaceInvoice(authResult.auth.user.id, {
        orderTotal: body.total,
        serviceTitle: body.serviceTitle,
        buyerName: authResult.auth.user.fullName ?? authResult.auth.user.email,
      });
    }

    return NextResponse.json({ success: true, escrow, invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to lock escrow payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
