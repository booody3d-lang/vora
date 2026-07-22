import { NextResponse } from "next/server";
import { incrementShareCount } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as { quoteText?: string };
    const shareCount = await incrementShareCount(auth.user.id, postId, body.quoteText);
    return NextResponse.json({ shareCount });
  } catch {
    return NextResponse.json({ error: "Share failed" }, { status: 500 });
  }
}
