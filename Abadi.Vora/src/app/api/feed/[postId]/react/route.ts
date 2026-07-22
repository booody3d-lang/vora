import { NextResponse } from "next/server";
import { togglePostReaction } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { ReactionType } from "@/types/network";

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
    const body = (await request.json()) as { type?: ReactionType | null };
    const result = togglePostReaction(auth.user.id, postId, body.type ?? null);
    if (!result) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Reaction failed" }, { status: 500 });
  }
}
