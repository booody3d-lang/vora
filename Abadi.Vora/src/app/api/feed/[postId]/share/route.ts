import { NextResponse } from "next/server";
import { incrementShareCount } from "@/lib/network/feed-store";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { postId } = await params;
  const shareCount = incrementShareCount(postId);
  return NextResponse.json({ shareCount });
}
