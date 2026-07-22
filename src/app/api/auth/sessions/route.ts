import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const UNAVAILABLE_MESSAGE =
  "Session management is being migrated to Supabase Auth and is temporarily unavailable.";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({
      sessions: [
        {
          id: session.sessionId,
          deviceLabel: "Current browser",
          isCurrent: true,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
      ],
      note: UNAVAILABLE_MESSAGE,
    });
  }

  const { getSessionsForAccount } = await import("@/lib/security/demo-store");
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

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { sessionId?: string; all?: boolean };
  const { revokeAllSessions, revokeSession } = await import("@/lib/security/demo-store");
  const { revokeAllPersistedSessions, revokePersistedSession } = await import(
    "@/lib/security/auth-store"
  );

  if (body.all) {
    const count = revokeAllSessions(session.sub, session.sessionId);
    revokeAllPersistedSessions(session.sub, session.sessionId);
    return NextResponse.json({ revoked: count });
  }

  if (body.sessionId) {
    revokeSession(body.sessionId);
    revokePersistedSession(body.sessionId);
    return NextResponse.json({ revoked: 1 });
  }

  return NextResponse.json({ error: "Specify sessionId or all:true" }, { status: 400 });
}
