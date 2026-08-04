import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  deleteAlbum,
  getAlbumById,
  listAlbumPhotos,
  updateAlbum,
} from "@/lib/albums-stories/albums-stories-store";
import { canViewOwnedContent } from "@/lib/albums-stories/access";
import type { ContentVisibility } from "@/types/albums-stories";

interface Params {
  params: Promise<{ albumId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { albumId } = await params;
  const auth = await getAuthenticatedUser();
  const result = await listAlbumPhotos(albumId, auth?.user.id ?? null);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ album: result.album, photos: result.photos });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { albumId } = await params;
  const body = (await request.json()) as {
    title?: string;
    visibility?: ContentVisibility;
  };
  const result = await updateAlbum(albumId, auth.user.id, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ album: result.album });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { albumId } = await params;
  const result = await deleteAlbum(albumId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ ok: true });
}

/** Lightweight existence/visibility check without listing photos */
export async function HEAD(_request: Request, { params }: Params) {
  const { albumId } = await params;
  const auth = await getAuthenticatedUser();
  const album = await getAlbumById(albumId);
  if (!album) return new NextResponse(null, { status: 404 });
  const allowed = await canViewOwnedContent(
    auth?.user.id ?? null,
    album.ownerType,
    album.ownerId,
    album.visibility
  );
  return new NextResponse(null, { status: allowed ? 200 : 403 });
}
