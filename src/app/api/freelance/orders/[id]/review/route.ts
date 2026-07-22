import { NextResponse } from "next/server";
import { completeOrderEscrow } from "@/lib/billing/wallet-store";
import { updateOrderForParticipant } from "@/lib/freelance/orders-store";
import {
  isReviewsPersistenceActive,
  submitReviewForOrder,
} from "@/lib/freelance/reviews-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";
import type { ReviewSubmission } from "@/types/freelance";

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
    const body = (await request.json()) as ReviewSubmission & {
      sellerId?: string;
      total?: number;
    };

    if (
      !body.publicReview?.trim() ||
      !body.overallQuality ||
      !body.communication ||
      !body.deliveryPunctuality
    ) {
      return NextResponse.json({ error: "Complete review is required" }, { status: 400 });
    }

    const submission: ReviewSubmission = {
      overallQuality: body.overallQuality,
      communication: body.communication,
      deliveryPunctuality: body.deliveryPunctuality,
      publicReview: body.publicReview.trim(),
    };

    const updatedOrder = await updateOrderForParticipant(orderId, auth.user.id, {
      status: "completed",
      escrowReleased: true,
    });
    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (body.sellerId && body.total && body.total > 0) {
      await completeOrderEscrow(orderId, body.sellerId, body.total);
    }

    const review = await submitReviewForOrder(
      orderId,
      auth.user.id,
      submission,
      auth.user.fullName ?? auth.user.email
    );

    return NextResponse.json({
      review,
      order: updatedOrder,
      persistence: isReviewsPersistenceActive() ? "supabase" : "json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit review";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
