import { NextResponse } from "next/server";
import { createFeedPost, getFeedPosts } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { CreatePostInput } from "@/types/network";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  const posts = await getFeedPosts(auth?.user.id, { limit, offset });
  return NextResponse.json({ posts, limit, offset });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreatePostInput;
    if (!body.type) {
      return NextResponse.json({ error: "Post type required" }, { status: 400 });
    }

    const post = await createFeedPost(auth.user.id, body);
    if (!post) {
      return NextResponse.json({ error: "Profile required to post" }, { status: 400 });
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
