import type { NotificationPayload } from "@/types/notifications";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { sendEmail } from "@/lib/email/send";
import { resolveEmailLocale } from "@/lib/email/email-i18n";
import { emitNotification } from "@/lib/notifications/engine";
import { resolveNotificationRecipientAsync } from "@/lib/notifications/recipient-resolver";
import { SITE_URL } from "@/i18n/config";

function isOwnerAlertTrigger(notification: NotificationPayload): boolean {
  return (
    notification.isCritical ||
    notification.trigger === "subscription_payment" ||
    notification.trigger === "withdrawal_request" ||
    notification.trigger === "failed_login" ||
    notification.trigger === "rate_limit_violation" ||
    notification.trigger === "dispute_filed" ||
    notification.trigger === "abuse_report" ||
    notification.trigger === "ban_appeal" ||
    notification.trigger === "support_ticket"
  );
}

export async function serverDispatchNotification(
  notification: NotificationPayload,
  opts?: { ownerEmail?: boolean; recipientEmail?: string; accountId?: string }
): Promise<NotificationPayload> {
  const isOwnerAlert = opts?.ownerEmail ?? isOwnerAlertTrigger(notification);

  if (notification.channels.includes("email") || isOwnerAlert) {
    const locale = resolveEmailLocale({
      titleAr: notification.titleAr,
      bodyAr: notification.bodyAr,
    });

    const html = buildEmailHtml({
      title: notification.title,
      body: notification.body,
      titleAr: notification.titleAr,
      bodyAr: notification.bodyAr,
      locale,
      ctaUrl: notification.href ? `${SITE_URL}${notification.href}` : undefined,
      amountSar: notification.amountSar,
    });

    const recipient = await resolveNotificationRecipientAsync({
      notification,
      ownerEmail: isOwnerAlert,
      recipientEmail: opts?.recipientEmail,
      accountId: opts?.accountId,
    });

    if (recipient.to) {
      await sendEmail({
        to: recipient.to,
        subject: locale === "ar" && notification.titleAr ? notification.titleAr : notification.title,
        html,
        text: locale === "ar" && notification.bodyAr ? notification.bodyAr : notification.body,
        trigger: notification.trigger,
        locale,
      });
    } else {
      console.warn("[email] skipped notification email", {
        trigger: notification.trigger,
        reason: recipient.reason,
      });
    }
  }

  if (notification.channels.includes("in_app")) {
    emitNotification(notification);
  }

  return notification;
}
