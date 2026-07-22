import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import { addReport, getReports } from "@/lib/security/demo-store";
import { checkSpamMessages } from "@/lib/security/anti-abuse";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import type { ReportTargetType } from "@/types/security";

export async function POST(request: Request) {
  const session = await getServerSession();
  const body = await request.json() as {
    targetType: ReportTargetType;
    targetId: string;
    targetLabel: string;
    reason: string;
    details?: string;
  };

  if (body.details) {
    const spam = checkSpamMessages(session?.sub ?? "anonymous", body.details);
    if (spam.flagged) {
      return NextResponse.json({ error: spam.message }, { status: 403 });
    }
  }

  const report = {
    id: `report-${Date.now()}`,
    targetType: body.targetType,
    targetId: body.targetId,
    targetLabel: body.targetLabel,
    reason: body.reason,
    details: body.details,
    status: "pending" as const,
    priority: "high" as const,
    createdAt: new Date().toISOString(),
  };

  addReport(report);

  await serverDispatchNotification(
    buildTriggerNotification({
      trigger: "abuse_report",
      title: "New Abuse Report",
      titleAr: "بلاغ جديد",
      body: `${body.targetType}: ${body.targetLabel} — ${body.reason}`,
      href: "/admin/moderation",
      isCritical: true,
      channels: ["in_app", "email"],
    }),
    { ownerEmail: true }
  );

  return NextResponse.json({ success: true, reportId: report.id });
}

export async function GET() {
  const session = await getServerSession();
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ reports: getReports() });
}
