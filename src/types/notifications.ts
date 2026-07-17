export type NotificationCategory =
  | "social"
  | "employment"
  | "financial"
  | "owner"
  | "security"
  | "moderation";

export type NotificationChannel = "in_app" | "email" | "push";

export type NotificationTrigger =
  // Social
  | "new_follower"
  | "connection_accepted"
  | "post_comment"
  | "post_like"
  | "post_share"
  | "post_mention"
  // Employment
  | "job_invitation"
  | "application_status_change"
  | "corporate_announcement"
  // Financial / Marketplace
  | "new_order"
  | "work_delivered"
  | "revision_requested"
  | "review_published"
  | "dispute_filed"
  | "subscription_payment"
  | "withdrawal_request"
  // Owner / Security
  | "failed_login"
  | "rate_limit_violation"
  | "abuse_report"
  | "ban_appeal"
  | "support_ticket";

export type ChatType = "network" | "freelance";

export type FreelanceChatUnlockReason = "escrow_paid" | "inquiry_accepted" | "locked";

export interface NotificationPayload {
  id: string;
  trigger: NotificationTrigger;
  category: NotificationCategory;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  href?: string;
  amountSar?: number;
  isRead: boolean;
  isCritical: boolean;
  createdAt: string;
  channels: NotificationChannel[];
}

export interface NotificationPreferences {
  globalEnabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  categories: Record<
    NotificationCategory,
    {
      enabled: boolean;
      email: boolean;
      push: boolean;
    }
  >;
}

export interface FreelanceInquiry {
  id: string;
  buyerName: string;
  serviceTitle: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface FreelanceChatSession {
  id: string;
  orderId?: string;
  orderNumber?: string;
  orderStatus?: string;
  buyerName: string;
  sellerName: string;
  isUnlocked: boolean;
  unlockReason: FreelanceChatUnlockReason;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface OwnerAlert extends NotificationPayload {
  category: "owner" | "security" | "financial";
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  globalEnabled: true,
  channels: { inApp: true, email: true, push: true },
  categories: {
    social: { enabled: true, email: false, push: true },
    employment: { enabled: true, email: true, push: true },
    financial: { enabled: true, email: true, push: true },
    owner: { enabled: true, email: true, push: true },
    security: { enabled: true, email: true, push: true },
    moderation: { enabled: true, email: true, push: false },
  },
};

export const TRIGGER_CATEGORY: Record<NotificationTrigger, NotificationCategory> = {
  new_follower: "social",
  connection_accepted: "social",
  post_comment: "social",
  post_like: "social",
  post_share: "social",
  post_mention: "social",
  job_invitation: "employment",
  application_status_change: "employment",
  corporate_announcement: "employment",
  new_order: "financial",
  work_delivered: "financial",
  revision_requested: "financial",
  review_published: "financial",
  dispute_filed: "financial",
  subscription_payment: "financial",
  withdrawal_request: "financial",
  failed_login: "security",
  rate_limit_violation: "security",
  abuse_report: "moderation",
  ban_appeal: "moderation",
  support_ticket: "moderation",
};
