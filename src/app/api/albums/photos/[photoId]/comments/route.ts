import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  addAlbumPhotoComment,
  listAlbumPhotoComments,
} from "@/lib/albums-stories/albums-stories-store";

interface Params {
  params: Promise<{ photoId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  const { photoId } = await params;
  const result = await listAlbumPhotoComments(photoId, auth?.user.id ?? null);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ comments: result.comments });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photoId } = await params;
  const body = (await request.json()) as { content?: string; parentId?: string };
  const result = await addAlbumPhotoComment(
    photoId,
    auth.user.id,
    body.content ?? "",
    body.parentId ?? null
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("followers") ? 403 : 400 }
    );
  }
  return NextResponse.json({ comment: result.comment }, { status: 201 });
}
