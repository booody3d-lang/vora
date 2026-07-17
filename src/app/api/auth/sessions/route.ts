import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import { getSessionsForAccount, revokeAllSessions, revokeSession } from "@/lib/security/demo-store";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessions = getSessionsForAccount(session.sub).map((s) => ({
    ...s,
    isCurrent: s.id === session.sessionId,
  }));
  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { sessionId?: string; all?: boolean };

  if (body.all) {
    const count = revokeAllSessions(session.sub, session.sessionId);
    return NextResponse.json({ revoked: count });
  }

  if (body.sessionId) {
    revokeSession(body.sessionId);
    return NextResponse.json({ revoked: 1 });
  }

  return NextResponse.json({ error: "Specify sessionId or all:true" }, { status: 400 });
}
