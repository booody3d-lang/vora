import { NextResponse } from "next/server";
import { getRequestAuditContext, writeSecurityAuditEvent } from "@/lib/security/audit-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { resolveCurrentTokenHash } from "@/lib/auth/persist-login-session";
import { revokeUserSession } from "@/lib/auth/sessions-store";
import { revokeSession } from "@/lib/security/demo-store";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Session id required" }, { status: 400 });
  }

  const currentTokenHash = await resolveCurrentTokenHash();
  const sessions = await import("@/lib/auth/sessions-store").then((m) =>
    m.listUserSessions(auth.user.id, currentTokenHash ?? undefined)
  );
  const target = sessions.find((s) => s.id === id);
  if (target?.isCurrent) {
    return NextResponse.json({ error: "Cannot revoke current session" }, { status: 400 });
  }

  const revoked = await revokeUserSession(auth.user.id, id);
  revokeSession(id);

  if (!revoked) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { ip, userAgent } = getRequestAuditContext(request);
  await writeSecurityAuditEvent({
    accountId: auth.user.id,
    action: "security.session.revoked",
    ip,
    userAgent,
    metadata: { sessionId: id, deviceLabel: target?.deviceLabel },
  });

  return NextResponse.json({ revoked: 1 });
}
