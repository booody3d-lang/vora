import type { NotificationPayload } from "@/types/notifications";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { emitNotification } from "@/lib/notifications/engine";

const OWNER_EMAIL = process.env.VORA_OWNER_EMAIL ?? "owner@vora.sa";

export async function serverDispatchNotification(
  notification: NotificationPayload,
  opts?: { ownerEmail?: boolean; recipientEmail?: string }
): Promise<NotificationPayload> {
  const isOwnerAlert =
    opts?.ownerEmail ??
    (notification.isCritical ||
      notification.trigger === "subscription_payment" ||
      notification.trigger === "withdrawal_request" ||
      notification.trigger === "failed_login" ||
      notification.trigger === "rate_limit_violation" ||
      notification.trigger === "dispute_filed" ||
      notification.trigger === "abuse_report" ||
      notification.trigger === "ban_appeal" ||
      notification.trigger === "support_ticket");

  if (notification.channels.includes("email") || isOwnerAlert) {
    const html = buildEmailHtml({
      title: notification.title,
      body: notification.body,
      ctaUrl: notification.href ? `https://vora.sa${notification.href}` : undefined,
      amountSar: notification.amountSar,
    });

    const to = isOwnerAlert ? OWNER_EMAIL : opts?.recipientEmail ?? "user@vora.sa";
    console.info(`[VORA Email] To: ${to} | Subject: ${notification.title} | Trigger: ${notification.trigger}`);
    void html;
  }

  if (notification.channels.includes("in_app")) {
    emitNotification(notification);
  }

  return notification;
}
