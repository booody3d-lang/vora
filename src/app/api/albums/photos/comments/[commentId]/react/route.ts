import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { setAlbumPhotoCommentReaction } from "@/lib/albums-stories/albums-stories-store";
import type { StoryReactionEmoji } from "@/types/albums-stories";

const ALLOWED: StoryReactionEmoji[] = ["like", "love", "laugh", "wow", "sad", "fire"];

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { commentId } = await params;
  const body = (await request.json()) as { emoji?: StoryReactionEmoji | null };
  const emoji =
    body.emoji == null ? null : ALLOWED.includes(body.emoji) ? body.emoji : null;
  if (body.emoji != null && emoji == null) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const result = await setAlbumPhotoCommentReaction(commentId, auth.user.id, emoji);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("followers") ? 403 : 404 }
    );
  }
  return NextResponse.json(result);
}
