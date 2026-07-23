import { NextResponse } from "next/server";
import { changeSupabasePassword } from "@/lib/auth/supabase-password";
import { changeAccountPassword } from "@/lib/security/account-password";
import { getRequestAuditContext, writeSecurityAuditEvent } from "@/lib/security/audit-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const result = await changeSupabasePassword(
        auth.user.email,
        body.currentPassword,
        body.newPassword
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const { ip, userAgent } = getRequestAuditContext(request);
      await writeSecurityAuditEvent({
        accountId: auth.user.id,
        action: "security.password.changed",
        ip,
        userAgent,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await changeAccountPassword(
      auth.user.id,
      body.currentPassword,
      body.newPassword
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { ip, userAgent } = getRequestAuditContext(request);
    await writeSecurityAuditEvent({
      accountId: auth.user.id,
      action: "security.password.changed",
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
