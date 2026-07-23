import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { resolveCurrentTokenHash } from "@/lib/auth/persist-login-session";
import { revokeOtherUserSessions } from "@/lib/auth/sessions-store";
import { revokeAllSessions } from "@/lib/security/demo-store";
import { revokeAllPersistedSessions } from "@/lib/security/auth-store";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentTokenHash = await resolveCurrentTokenHash();
  let revoked = 0;

  if (currentTokenHash) {
    revoked = await revokeOtherUserSessions(auth.user.id, currentTokenHash);
  }

  revoked += revokeAllSessions(auth.user.id, auth.session.sessionId);
  revokeAllPersistedSessions(auth.user.id, auth.session.sessionId);

  return NextResponse.json({ revoked });
}
