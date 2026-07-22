import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPayload } from "@/types/notifications";

interface DbNotificationRow {
  id: string;
  account_id: string;
  trigger_type: string;
  category: string;
  title: string;
  title_ar: string | null;
  body: string;
  body_ar: string | null;
  href: string | null;
  amount_sar: number | null;
  is_read: boolean;
  is_critical: boolean;
  channels: string[];
  created_at: string;
}

function mapDbNotificationToPayload(row: DbNotificationRow): NotificationPayload {
  return {
    id: row.id,
    trigger: row.trigger_type as NotificationPayload["trigger"],
    category: row.category as NotificationPayload["category"],
    title: row.title,
    titleAr: row.title_ar ?? undefined,
    body: row.body,
    bodyAr: row.body_ar ?? undefined,
    href: row.href ?? undefined,
    amountSar: row.amount_sar != null ? Number(row.amount_sar) : undefined,
    isRead: row.is_read,
    isCritical: row.is_critical,
    createdAt: row.created_at,
    channels: (row.channels as NotificationPayload["channels"]) ?? ["in_app"],
  };
}

function mapPayloadToDb(
  accountId: string,
  notification: NotificationPayload
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    account_id: accountId,
    trigger_type: notification.trigger,
    category: notification.category,
    title: notification.title,
    title_ar: notification.titleAr ?? null,
    body: notification.body,
    body_ar: notification.bodyAr ?? null,
    href: notification.href ?? null,
    amount_sar: notification.amountSar ?? null,
    is_read: notification.isRead,
    is_critical: notification.isCritical,
    channels: notification.channels,
  };

  if (notification.id && !notification.id.startsWith("notif-")) {
    row.id = notification.id;
  }

  return row;
}

export async function insertNotificationInSupabase(
  accountId: string,
  notification: NotificationPayload
): Promise<NotificationPayload> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert(mapPayloadToDb(accountId, notification))
    .select("*")
    .single();
  if (error) throw error;
  return mapDbNotificationToPayload(data as DbNotificationRow);
}

export async function listNotificationsFromSupabase(
  accountId: string,
  limit = 50
): Promise<NotificationPayload[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DbNotificationRow[]).map(mapDbNotificationToPayload);
}

export async function markNotificationReadInSupabase(
  accountId: string,
  notificationId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("account_id", accountId)
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsReadInSupabase(accountId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("account_id", accountId)
    .eq("is_read", false);
  if (error) throw error;
}
