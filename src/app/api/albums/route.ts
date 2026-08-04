import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { createAlbum, listAlbumsForOwner } from "@/lib/albums-stories/albums-stories-store";
import type { ContentOwnerType, ContentVisibility } from "@/types/albums-stories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ownerType = searchParams.get("ownerType") as ContentOwnerType | null;
  const ownerId = searchParams.get("ownerId");
  if (!ownerType || !ownerId || !["user", "company"].includes(ownerType)) {
    return NextResponse.json({ error: "ownerType and ownerId are required" }, { status: 400 });
  }

  const auth = await getAuthenticatedUser();
  const albums = await listAlbumsForOwner(ownerType, ownerId, auth?.user.id ?? null);
  return NextResponse.json({ albums });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    ownerType?: ContentOwnerType;
    ownerId?: string;
    title?: string;
    visibility?: ContentVisibility;
  };

  if (!body.ownerType || !body.ownerId || !body.title) {
    return NextResponse.json({ error: "Missing album fields" }, { status: 400 });
  }

  const result = await createAlbum(
    {
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      title: body.title,
      visibility: body.visibility === "followers_only" ? "followers_only" : "public",
    },
    auth.user.id
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 400 }
    );
  }
  return NextResponse.json({ album: result.album }, { status: 201 });
}
