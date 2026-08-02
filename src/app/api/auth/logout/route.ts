import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import { getRequestAuditContext, writeSecurityAuditEvent } from "@/lib/security/audit-store";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStrictProduction } from "@/lib/env/validate";
import { COOKIE_NAME } from "@/lib/security/jwt";
import { getServerSession } from "@/lib/security/session";
import { resolveCurrentTokenHash } from "@/lib/auth/persist-login-session";
import { revokeOtherUserSessions, revokeUserSession } from "@/lib/auth/sessions-store";

export async function POST(request: Request) {
  const session = await getServerSession();
  const body = (await request.json().catch(() => ({}))) as { allDevices?: boolean };

  if (session) {
    const currentTokenHash = await resolveCurrentTokenHash();
    if (body.allDevices) {
      if (currentTokenHash) {
        await revokeOtherUserSessions(session.sub, currentTokenHash);
      }
      if (!isStrictProduction()) {
        const { revokeAllSessions } = await import("@/lib/security/demo-store");
        revokeAllSessions(session.sub, session.sessionId);
      }
      const { ip, userAgent } = getRequestAuditContext(request);
      await writeSecurityAuditEvent({
        accountId: session.sub,
        action: "security.logout.all_devices",
        ip,
        userAgent,
      });
    } else if (currentTokenHash) {
      const sessions = await import("@/lib/auth/sessions-store").then((m) =>
        m.listUserSessions(session.sub, currentTokenHash)
      );
      const current = sessions.find((s) => s.isCurrent);
      if (current) {
        await revokeUserSession(session.sub, current.id);
      }
      if (!isStrictProduction()) {
        const { revokeSession } = await import("@/lib/security/demo-store");
        revokeSession(session.sessionId);
      }
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({ success: true });
  clearLegacySessionCookie(response);
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
