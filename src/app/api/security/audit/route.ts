import { NextRequest, NextResponse } from "next/server";
import { listSecurityAuditEvents } from "@/lib/security/audit-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsed = limitParam ? Number.parseInt(limitParam, 10) : 30;
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 30;

  const events = await listSecurityAuditEvents(auth.user.id, limit);
  return NextResponse.json({ events });
}
