import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import {
  ensurePrivacySettingsInSupabase,
  queueDataDeletionRequest,
  upsertPrivacySettingsInSupabase,
} from "@/lib/security/privacy-supabase";
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
    return NextResponse.json({
      success: true,
      message: "Data deletion request queued. Account will be purged within 30 days per PDPL/GDPR.",
      scheduledAt,
    });
  } catch (error) {
    console.error("[privacy] DELETE failed", error);
    return NextResponse.json({ error: "Failed to queue deletion request" }, { status: 500 });
  }
}
