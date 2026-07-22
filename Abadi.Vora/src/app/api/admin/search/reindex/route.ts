import { NextResponse } from "next/server";
import { rebuildSearchIndex } from "@/lib/search/search-index";
import { getAuthenticatedUser, requireActivityMonitoring } from "@/lib/security/session";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireActivityMonitoring(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const index = rebuildSearchIndex();
  return NextResponse.json({
    ok: true,
    count: index.entries.length,
    builtAt: index.builtAt,
  });
}
