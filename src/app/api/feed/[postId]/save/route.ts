import { NextResponse } from "next/server";
import { togglePostSave } from "@/lib/network/feed-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const isSaved = await togglePostSave(auth.user.id, postId);
    return NextResponse.json({ isSaved });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
