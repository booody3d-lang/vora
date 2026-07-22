import { NextResponse } from "next/server";
import { deletePostForAccount } from "@/lib/company/posts-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const { id } = await context.params;
  const deleted = await deletePostForAccount(authResult.auth.user.id, id);

  if (!deleted) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
