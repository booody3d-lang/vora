import { NextResponse } from "next/server";
import { createFeedPost, getFeedPosts } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { CreatePostInput } from "@/types/network";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const posts = getFeedPosts(auth?.user.id);
  return NextResponse.json({ posts });
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

    const post = createFeedPost(auth.user.id, body);
    if (!post) {
      return NextResponse.json({ error: "Profile required to post" }, { status: 400 });
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
