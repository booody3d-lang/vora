import type { NotificationPayload } from "@/types/notifications";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { sendEmail } from "@/lib/email/send";
import { resolveEmailLocale } from "@/lib/email/email-i18n";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import { emitNotification, resolveChannels } from "@/lib/notifications/engine";
import { getNotificationPreferences } from "@/lib/notifications/notification-preferences-store";
import { persistInAppNotification } from "@/lib/notifications/notifications-store";
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

  let enriched = notification;
  if (!isOwnerAlert && opts?.accountId) {
    const prefs = await getNotificationPreferences(opts.accountId);
    const channels = resolveChannels(notification.trigger, prefs);
    enriched = { ...notification, channels };
  } else if (isOwnerAlert) {
    enriched = {
      ...notification,
      channels: notification.channels.length ? notification.channels : ["in_app", "email"],
    };
  }

  const shouldEmail =
    enriched.channels.includes("email") || isOwnerAlert;

  if (shouldEmail) {
    const locale = resolveEmailLocale({
      titleAr: enriched.titleAr,
      bodyAr: enriched.bodyAr,
    });

    const html = buildEmailHtml({
      title: enriched.title,
      body: enriched.body,
      titleAr: enriched.titleAr,
      bodyAr: enriched.bodyAr,
      locale,
      ctaUrl: enriched.href ? `${SITE_URL}${enriched.href}` : undefined,
      amountSar: enriched.amountSar,
    });

    const recipient = await resolveNotificationRecipientAsync({
      notification: enriched,
      ownerEmail: isOwnerAlert,
      recipientEmail: opts?.recipientEmail,
      accountId: opts?.accountId,
    });

    if (recipient.to) {
      try {
        await sendEmail({
          to: recipient.to,
          subject: locale === "ar" && enriched.titleAr ? enriched.titleAr : enriched.title,
          html,
          text: locale === "ar" && enriched.bodyAr ? enriched.bodyAr : enriched.body,
          trigger: enriched.trigger,
          locale,
        });
      } catch (error) {
        if (error instanceof NotificationProviderNotReadyError) {
          console.error("[email] notification dispatch blocked", {
            trigger: enriched.trigger,
            reason: error.message,
          });
        } else {
          throw error;
        }
      }
    } else {
      console.warn("[email] skipped notification email", {
        trigger: enriched.trigger,
        reason: recipient.reason,
      });
    }
  }

  if (enriched.channels.includes("in_app")) {
    if (opts?.accountId && !isOwnerAlert) {
      await persistInAppNotification(opts.accountId, enriched);
    } else {
      emitNotification(enriched);
    }
  }

  return enriched;
}
