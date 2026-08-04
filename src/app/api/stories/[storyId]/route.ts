import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { deleteStory } from "@/lib/albums-stories/albums-stories-store";

interface Params {
  params: Promise<{ storyId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { storyId } = await params;
  const result = await deleteStory(storyId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Forbidden" ? 403 : 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
