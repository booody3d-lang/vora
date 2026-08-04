import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { deleteAlbumPhoto } from "@/lib/albums-stories/albums-stories-store";

interface Params {
  params: Promise<{ photoId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photoId } = await params;
  const result = await deleteAlbumPhoto(photoId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
