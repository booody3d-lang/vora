import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  insertNotificationInSupabase,
  listNotificationsFromSupabase,
  markAllNotificationsReadInSupabase,
  markNotificationReadInSupabase,
} from "@/lib/notifications/notifications-supabase";
import type { NotificationPayload } from "@/types/notifications";

let notificationsTableProbed = false;
let notificationsTableAvailable = false;

async function isNotificationsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (notificationsTableProbed) return notificationsTableAvailable;

  notificationsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("notifications missing", error);
      }
      notificationsTableAvailable = false;
      return false;
    }
    notificationsTableAvailable = true;
    return true;
  } catch {
    notificationsTableAvailable = false;
    return false;
  }
}

export async function listAccountNotifications(
  accountId: string,
  limit = 50
): Promise<NotificationPayload[]> {
  if (!(await isNotificationsSupabaseReady())) return [];

  return runOptionalDbSync(
    "listAccountNotifications",
    () => listNotificationsFromSupabase(accountId, limit),
    []
  );
}

export async function persistInAppNotification(
  accountId: string,
  notification: NotificationPayload
): Promise<NotificationPayload> {
  if (!(await isNotificationsSupabaseReady())) {
    return notification;
  }

  return runOptionalDbSync(
    "persistInAppNotification",
    () => insertNotificationInSupabase(accountId, notification),
    notification
  );
}

export async function markNotificationRead(accountId: string, notificationId: string): Promise<void> {
  if (!(await isNotificationsSupabaseReady())) return;

  await runOptionalDbSyncVoid("markNotificationRead", () =>
    markNotificationReadInSupabase(accountId, notificationId)
  );
}

export async function markAllNotificationsRead(accountId: string): Promise<void> {
  if (!(await isNotificationsSupabaseReady())) return;

  await runOptionalDbSyncVoid("markAllNotificationsRead", () =>
    markAllNotificationsReadInSupabase(accountId)
  );
}

export function isNotificationsPersistenceActive(): boolean {
  return notificationsTableAvailable;
}
