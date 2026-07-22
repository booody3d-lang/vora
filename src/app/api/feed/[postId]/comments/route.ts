import { NextResponse } from "next/server";
import { addPostComment } from "@/lib/network/feed-store";
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
    const body = (await request.json()) as { content?: string };
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Comment required" }, { status: 400 });
    }

    const comment = await addPostComment(auth.user.id, postId, body.content.trim());
    if (!comment) {
      return NextResponse.json({ error: "Failed to add comment" }, { status: 400 });
    }

    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json({ error: "Comment failed" }, { status: 500 });
  }
}
