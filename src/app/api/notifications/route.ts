import { NextResponse } from "next/server";
import { resolveChannels } from "@/lib/notifications/engine";
import { buildNotification } from "@/lib/notifications/mock-data";
import { getNotificationPreferences } from "@/lib/notifications/notification-preferences-store";
import {
  listAccountNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notifications-store";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { NotificationTrigger } from "@/types/notifications";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) {
    return NextResponse.json({ status: "ok", channels: ["in_app", "email", "push"] });
  }

  const notifications = await listAccountNotifications(authResult.auth.user.id);
  return NextResponse.json({ notifications });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
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

    if (body.isOwner) {
      const dispatched = await serverDispatchNotification(notification, { ownerEmail: true });
      return NextResponse.json({ success: true, notification: dispatched });
    }

    const authResult = await requireAuthenticatedApiUser();
    if ("response" in authResult) {
      return authResult.response;
    }

    const accountId = authResult.auth.user.id;
    const prefs = await getNotificationPreferences(accountId);
    const channels = resolveChannels(notification.trigger, prefs);
    const dispatched = await serverDispatchNotification(
      { ...notification, channels },
      { accountId }
    );
    return NextResponse.json({ success: true, notification: dispatched });
  } catch {
    return NextResponse.json({ error: "Failed to dispatch notification" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as { id?: string; markAll?: boolean };

    if (body.markAll) {
      await markAllNotificationsRead(authResult.auth.user.id);
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await markNotificationRead(authResult.auth.user.id, body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
