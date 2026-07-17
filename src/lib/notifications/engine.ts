import type {
  NotificationChannel,
  NotificationPayload,
  NotificationPreferences,
  NotificationTrigger,
} from "@/types/notifications";
import { TRIGGER_CATEGORY } from "@/types/notifications";

type NotificationListener = (notification: NotificationPayload) => void;

const listeners = new Set<NotificationListener>();

export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitNotification(notification: NotificationPayload): void {
  listeners.forEach((l) => l(notification));
}

export function resolveChannels(
  trigger: NotificationTrigger,
  prefs: NotificationPreferences
): NotificationChannel[] {
  if (!prefs.globalEnabled) return [];

  const category = TRIGGER_CATEGORY[trigger];
  const catPrefs = prefs.categories[category];
  if (!catPrefs?.enabled) return [];

  const channels: NotificationChannel[] = [];
  if (prefs.channels.inApp) channels.push("in_app");
  if (catPrefs.email && prefs.channels.email) channels.push("email");
  if (catPrefs.push && prefs.channels.push) channels.push("push");
  return channels;
}

export async function dispatchNotification(
  notification: NotificationPayload,
  prefs: NotificationPreferences
): Promise<NotificationPayload> {
  const channels = resolveChannels(notification.trigger, prefs);
  const enriched = { ...notification, channels };

  if (channels.includes("in_app")) {
    emitNotification(enriched);
  }

  if (channels.includes("email")) {
    await sendEmailNotification(enriched);
  }

  if (channels.includes("push")) {
    await sendPushNotification(enriched);
  }

  return enriched;
}

async function sendEmailNotification(notification: NotificationPayload): Promise<void> {
  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "user@vora.sa",
        subject: notification.title,
        body: notification.body,
        trigger: notification.trigger,
      }),
    });
  } catch {
    // Demo mode — email queued locally
    console.info("[VORA Email]", notification.title);
  }
}

async function sendPushNotification(notification: NotificationPayload): Promise<void> {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(notification.title, { body: notification.body });
  }
}

export function formatSarInline(amount: number): string {
  return `SR ${amount.toLocaleString("en-SA")}`;
}
