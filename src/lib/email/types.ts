export type EmailProviderId = "console" | "resend";

export type EmailDeliveryStatus = "queued" | "sent" | "failed" | "skipped";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trigger?: string;
  locale?: "en" | "ar";
  replyTo?: string;
}

export interface SendEmailResult {
  queued: boolean;
  sent: boolean;
  provider: EmailProviderId;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface EmailDeliveryLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  trigger?: string;
  provider: EmailProviderId;
  status: EmailDeliveryStatus;
  messageId?: string;
  errorMessage?: string;
  payloadSummary?: Record<string, unknown>;
  createdAt: string;
}
