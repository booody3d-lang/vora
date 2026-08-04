import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { addAlbumPhoto } from "@/lib/albums-stories/albums-stories-store";

interface Params {
  params: Promise<{ albumId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { albumId } = await params;
  const body = (await request.json()) as {
    url?: string;
    caption?: string;
    mimeType?: string;
  };
  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const result = await addAlbumPhoto(albumId, auth.user.id, {
    url: body.url,
    caption: body.caption,
    mimeType: body.mimeType,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ photo: result.photo }, { status: 201 });
}
