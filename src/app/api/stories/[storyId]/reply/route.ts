import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { replyToStory } from "@/lib/albums-stories/albums-stories-store";

interface Params {
  params: Promise<{ storyId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { storyId } = await params;
  const body = (await request.json()) as { text?: string };
  const result = await replyToStory(storyId, auth.user.id, body.text ?? "");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status:
          result.error.includes("followers") || result.error.includes("Forbidden")
            ? 403
            : 400,
      }
    );
  }
  return NextResponse.json(result);
}
