import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/security/jwt";
import { getServerSession } from "@/lib/security/session";
import { revokeAllSessions, revokeSession } from "@/lib/security/demo-store";

export async function POST(request: Request) {
  const session = await getServerSession();
  const body = await request.json().catch(() => ({})) as { allDevices?: boolean };

  if (session) {
    if (body.allDevices) {
      revokeAllSessions(session.sub, session.sessionId);
    } else {
      revokeSession(session.sessionId);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
