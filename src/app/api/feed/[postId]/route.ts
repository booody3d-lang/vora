import { NextResponse } from "next/server";
import {
  deleteFeedPost,
  getFeedPostById,
  updateFeedPost,
} from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { CreatePostInput } from "@/types/network";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  const { postId } = await params;

  const post = await getFeedPostById(postId, auth?.user.id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const body = (await request.json()) as Partial<CreatePostInput>;
    const post = await updateFeedPost(auth.user.id, postId, body);
    if (!post) {
      return NextResponse.json({ error: "Post not found or forbidden" }, { status: 403 });
    }
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const deleted = await deleteFeedPost(auth.user.id, postId);
    if (!deleted) {
      return NextResponse.json({ error: "Post not found or forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
