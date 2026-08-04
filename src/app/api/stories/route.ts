import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  createStory,
  listActiveStoriesForOwner,
  listStoriesFeed,
} from "@/lib/albums-stories/albums-stories-store";
import type {
  ContentOwnerType,
  ContentVisibility,
  StoryMediaType,
} from "@/types/albums-stories";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  const { searchParams } = new URL(request.url);
  const ownerType = searchParams.get("ownerType") as ContentOwnerType | null;
  const ownerId = searchParams.get("ownerId");
  const mode = searchParams.get("mode");

  if (mode === "feed" || (!ownerType && !ownerId)) {
    const groups = await listStoriesFeed(auth?.user.id ?? null);
    return NextResponse.json({ groups });
  }

  if (!ownerType || !ownerId || !["user", "company"].includes(ownerType)) {
    return NextResponse.json({ error: "ownerType and ownerId are required" }, { status: 400 });
  }

  const stories = await listActiveStoriesForOwner(
    ownerType,
    ownerId,
    auth?.user.id ?? null
  );
  return NextResponse.json({
    stories,
    hasActive: stories.length > 0,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    ownerType?: ContentOwnerType;
    ownerId?: string;
    mediaUrl?: string;
    mediaType?: StoryMediaType;
    mimeType?: string;
    durationSeconds?: number;
    visibility?: ContentVisibility;
  };

  if (!body.ownerType || !body.ownerId || !body.mediaUrl || !body.mediaType) {
    return NextResponse.json({ error: "Missing story fields" }, { status: 400 });
  }

  const result = await createStory(
    {
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
      mimeType: body.mimeType,
      durationSeconds: body.durationSeconds,
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
  return NextResponse.json({ story: result.story }, { status: 201 });
}
