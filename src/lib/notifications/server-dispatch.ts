import type { NotificationPayload } from "@/types/notifications";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { sendEmail } from "@/lib/email/send";
import { emitNotification } from "@/lib/notifications/engine";
import { SITE_URL } from "@/i18n/config";
import { PLATFORM_OWNER_EMAIL } from "@/lib/security/roles";

const OWNER_EMAIL = process.env.VORA_OWNER_EMAIL ?? PLATFORM_OWNER_EMAIL;

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
      ctaUrl: notification.href ? `${SITE_URL}${notification.href}` : undefined,
      amountSar: notification.amountSar,
    });

    const to = isOwnerAlert ? OWNER_EMAIL : opts?.recipientEmail ?? "user@vora.sa";
    await sendEmail({
      to,
      subject: notification.title,
      html,
      text: notification.body,
      trigger: notification.trigger,
    });
  }

  if (notification.channels.includes("in_app")) {
    emitNotification(notification);
  }

  return notification;
}
