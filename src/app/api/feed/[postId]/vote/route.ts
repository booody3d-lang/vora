import { NextResponse } from "next/server";
import { votePoll } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const body = (await request.json()) as { optionIndex?: number };
    if (typeof body.optionIndex !== "number") {
      return NextResponse.json({ error: "optionIndex required" }, { status: 400 });
    }

    const result = await votePoll(auth.user.id, postId, body.optionIndex);
    if (!result) {
      return NextResponse.json({ error: "Vote failed" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
