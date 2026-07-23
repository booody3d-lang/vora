import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { resolveCurrentTokenHash } from "@/lib/auth/persist-login-session";
import { listUserSessions } from "@/lib/auth/sessions-store";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentTokenHash = await resolveCurrentTokenHash();
  const sessions = await listUserSessions(auth.user.id, currentTokenHash ?? undefined);

  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    all?: boolean;
  };

  const { revokeUserSession, revokeOtherUserSessions } = await import(
    "@/lib/auth/sessions-store"
  );
  const { revokeSession, revokeAllSessions } = await import("@/lib/security/demo-store");

  if (body.all) {
    const currentTokenHash = await resolveCurrentTokenHash();
    let revoked = 0;
    if (currentTokenHash) {
      revoked = await revokeOtherUserSessions(auth.user.id, currentTokenHash);
    }
    revoked += revokeAllSessions(auth.user.id, auth.session.sessionId);
    return NextResponse.json({ revoked });
  }

  if (body.sessionId) {
    const revoked = await revokeUserSession(auth.user.id, body.sessionId);
    revokeSession(body.sessionId);
    return NextResponse.json({ revoked: revoked ? 1 : 0 });
  }

  return NextResponse.json({ error: "Specify sessionId or all:true" }, { status: 400 });
}
