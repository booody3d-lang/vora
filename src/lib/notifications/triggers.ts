import type { NotificationPayload, NotificationTrigger } from "@/types/notifications";
import { buildNotification } from "@/lib/notifications/mock-data";

export interface TriggerInput {
  trigger: NotificationTrigger;
  title: string;
  body: string;
  titleAr?: string;
  bodyAr?: string;
  href?: string;
  amountSar?: number;
  isCritical?: boolean;
  channels?: NotificationPayload["channels"];
}

export function buildTriggerNotification(input: TriggerInput): NotificationPayload {
  return buildNotification(input.trigger, input.title, input.body, {
    titleAr: input.titleAr,
    bodyAr: input.bodyAr,
    href: input.href,
    amountSar: input.amountSar,
    isCritical: input.isCritical,
    channels: input.channels,
  });
}

export function subscriptionPaymentAlert(planLabel: string, amountSar: number, accountName: string) {
  return buildTriggerNotification({
    trigger: "subscription_payment",
    title: `New ${planLabel}`,
    titleAr: `اشتراك جديد — ${planLabel}`,
    body: `${accountName} subscribed to ${planLabel} — SR ${amountSar}`,
    bodyAr: `${accountName} اشترك في ${planLabel} — ${amountSar} ر.س`,
    amountSar,
    href: "/admin/finance",
    isCritical: true,
    channels: ["in_app", "email", "push"],
  });
}

export function withdrawalRequestAlert(holder: string, amountSar: number, bankName: string, ibanLast4: string) {
  return buildTriggerNotification({
    trigger: "withdrawal_request",
    title: "New Withdrawal Request",
    titleAr: "طلب سحب جديد",
    body: `${holder} requested SR ${amountSar.toLocaleString("en-SA")} transfer to ${bankName} (IBAN ending ${ibanLast4})`,
    bodyAr: `${holder} طلب تحويل ${amountSar.toLocaleString("en-SA")} ر.س إلى ${bankName}`,
    amountSar,
    href: "/admin/finance",
    isCritical: true,
    channels: ["in_app", "email"],
  });
}

export function applicationStatusAlert(applicantName: string, jobTitle: string, stageLabel: string, companyName: string) {
  return buildTriggerNotification({
    trigger: "application_status_change",
    title: `Moved to ${stageLabel}`,
    titleAr: `تم نقلك إلى ${stageLabel}`,
    body: `${companyName} moved your application for ${jobTitle} to ${stageLabel}.`,
    bodyAr: `${companyName} نقلت طلبك لوظيفة ${jobTitle} إلى ${stageLabel}.`,
    href: "/network/jobs",
    channels: ["in_app", "email", "push"],
  });
}

export function orderDeliveredAlert(orderNumber: string, orderId: string, sellerName: string) {
  return buildTriggerNotification({
    trigger: "work_delivered",
    title: "Work delivered for your review",
    titleAr: "تم تسليم العمل للمراجعة",
    body: `${sellerName} delivered final work for Order ${orderNumber}.`,
    bodyAr: `${sellerName} سلّم العمل النهائي للطلب ${orderNumber}.`,
    href: `/freelance/orders/${orderId}`,
    channels: ["in_app", "push"],
  });
}

export function revisionRequestedAlert(orderNumber: string, orderId: string, remaining: number) {
  return buildTriggerNotification({
    trigger: "revision_requested",
    title: "Revision requested",
    titleAr: "طلب تعديل",
    body: `Buyer requested a revision on Order ${orderNumber}. ${remaining} revisions remaining.`,
    bodyAr: `طلب المشتري تعديلاً على الطلب ${orderNumber}. متبقي ${remaining} تعديلات.`,
    href: `/freelance/orders/${orderId}`,
    channels: ["in_app", "email", "push"],
  });
}

export function reviewPublishedAlert(orderNumber: string, rating: number) {
  return buildTriggerNotification({
    trigger: "review_published",
    title: "New review published",
    titleAr: "تقييم جديد",
    body: `A ${rating}-star review was published for Order ${orderNumber}.`,
    bodyAr: `تم نشر تقييم ${rating} نجوم للطلب ${orderNumber}.`,
    href: "/freelance/dashboard",
    channels: ["in_app", "email", "push"],
  });
}

export function disputeFiledAlert(orderNumber: string, orderId: string, amountSar: number) {
  return buildTriggerNotification({
    trigger: "dispute_filed",
    title: "Dispute Ticket Opened",
    titleAr: "فتح نزاع",
    body: `Order ${orderNumber} — SR ${amountSar} escrow frozen. Urgent review required.`,
    bodyAr: `الطلب ${orderNumber} — تجميد ${amountSar} ر.س في Escrow. مراجعة عاجلة.`,
    amountSar,
    href: `/admin/disputes`,
    isCritical: true,
    channels: ["in_app", "email"],
  });
}

export function newOrderAlert(orderNumber: string, orderId: string, serviceTitle: string, amountSar: number) {
  return buildTriggerNotification({
    trigger: "new_order",
    title: "New order received",
    titleAr: "طلب جديد",
    body: `Order ${orderNumber} — ${serviceTitle} (SR ${amountSar})`,
    bodyAr: `طلب ${orderNumber} — ${serviceTitle} (${amountSar} ر.س)`,
    href: `/freelance/orders/${orderId}`,
    amountSar,
    channels: ["in_app", "email", "push"],
  });
}

export const PLAN_AMOUNTS: Record<string, { label: string; amount: number }> = {
  premium_monthly: { label: "Premium Monthly", amount: 20 },
  premium_yearly: { label: "Premium Yearly", amount: 120 },
  company_annual: { label: "Company Annual Registration", amount: 600 },
};
