import { NextResponse } from "next/server";
import {
  isReviewsPersistenceActive,
  listPublicReviewsForStoreSlug,
} from "@/lib/freelance/reviews-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const reviews = await listPublicReviewsForStoreSlug(slug);
  return NextResponse.json({
    reviews,
    persistence: isReviewsPersistenceActive() ? "supabase" : "json",
  });
}
