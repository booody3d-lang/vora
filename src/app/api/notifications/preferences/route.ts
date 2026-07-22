import { NextResponse } from "next/server";
import {
  getNotificationPreferences,
  isNotificationPrefsPersistenceActive,
  updateNotificationPreferences,
} from "@/lib/notifications/notification-preferences-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { NotificationPreferences } from "@/types/notifications";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const preferences = await getNotificationPreferences(authResult.auth.user.id);

  return NextResponse.json({
    preferences,
    persistence: isNotificationPrefsPersistenceActive() ? "supabase" : "default",
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as NotificationPreferences;
    const preferences = await updateNotificationPreferences(authResult.auth.user.id, body);
    return NextResponse.json({ success: true, preferences });
  } catch {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
