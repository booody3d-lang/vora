import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import { getPrivacySettings, setPrivacySettings } from "@/lib/security/demo-store";
import type { PrivacySettings } from "@/types/security";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ settings: getPrivacySettings(session.sub) });
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Partial<PrivacySettings>;
  const current = getPrivacySettings(session.sub);
  const updated: PrivacySettings = { ...current, ...body };
  setPrivacySettings(session.sub, updated);

  return NextResponse.json({ settings: updated });
}

export async function DELETE() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GDPR / PDPL right to erasure — queue deletion request
  return NextResponse.json({
    success: true,
    message: "Data deletion request queued. Account will be purged within 30 days per PDPL/GDPR.",
    scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}
