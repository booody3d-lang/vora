import "server-only";

import { PLATFORM_OWNER_EMAIL } from "@/lib/security/roles";

export function resolveResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

export function isResendConfigured(): boolean {
  return Boolean(resolveResendApiKey());
}

export function resolveResendFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "notifications@vora.sa"
  );
}

export function resolveResendReplyTo(): string | undefined {
  return process.env.RESEND_REPLY_TO?.trim() || undefined;
}

export function resolveOwnerNotificationEmail(): string {
  return process.env.VORA_OWNER_EMAIL?.trim() || PLATFORM_OWNER_EMAIL;
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
