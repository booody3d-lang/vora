import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import { getServerSession } from "@/lib/security/session";
import {
  ensurePrivacySettingsInSupabase,
  executeAccountDataDeletion,
  queueDataDeletionRequest,
  upsertPrivacySettingsInSupabase,
} from "@/lib/security/privacy-supabase";
import { COOKIE_NAME } from "@/lib/security/jwt";
import { writeSecurityAuditEvent } from "@/lib/security/audit-store";
import type { PrivacySettings } from "@/types/security";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await ensurePrivacySettingsInSupabase(session.sub);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[privacy] GET failed", error);
    return NextResponse.json({ error: "Failed to load privacy settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<PrivacySettings>;
    const current = await ensurePrivacySettingsInSupabase(session.sub);
    const updated: PrivacySettings = { ...current, ...body };
    await upsertPrivacySettingsInSupabase(session.sub, updated);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error("[privacy] PUT failed", error);
    return NextResponse.json({ error: "Failed to update privacy settings" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scheduledAt } = await queueDataDeletionRequest(session.sub);
    await executeAccountDataDeletion(session.sub);

    await writeSecurityAuditEvent({
      accountId: session.sub,
      action: "privacy.account_deleted",
      severity: "info",
      metadata: { scheduledAt },
    });

    const response = NextResponse.json({
      success: true,
      message: "Your account and associated data have been permanently deleted per GDPR/PDPL.",
      deletedAt: new Date().toISOString(),
    });
    clearLegacySessionCookie(response);
    response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[privacy] DELETE failed", error);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }
}
