import { NextResponse } from "next/server";
import { buildNotification } from "@/lib/notifications/mock-data";
import { dispatchNotification } from "@/lib/notifications/engine";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";
import type { NotificationTrigger } from "@/types/notifications";
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      trigger: NotificationTrigger;
      title: string;
      body: string;
      href?: string;
      amountSar?: number;
      isCritical?: boolean;
      isOwner?: boolean;
    };

    const notification = buildNotification(body.trigger, body.title, body.body, {
      href: body.href,
      amountSar: body.amountSar,
      isCritical: body.isCritical,
    });

    const dispatched = body.isOwner
      ? await serverDispatchNotification(notification, { ownerEmail: true })
      : await dispatchNotification(notification, DEFAULT_NOTIFICATION_PREFERENCES);
    return NextResponse.json({ success: true, notification: dispatched });
  } catch {
    return NextResponse.json({ error: "Failed to dispatch notification" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", channels: ["in_app", "email", "push"] });
}
