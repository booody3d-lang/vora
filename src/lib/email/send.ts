import "server-only";

import {
  getEmailProviderLabel,
  isEmailConsoleMode,
  resolveActiveEmailProvider,
} from "@/lib/email/email-provider";
import { persistEmailDeliveryLog } from "@/lib/email/email-log-supabase";
import { sendViaResend } from "@/lib/email/resend-client";
import { isValidEmailAddress, resolveResendReplyTo } from "@/lib/email/config";
import type { SendEmailInput, SendEmailResult } from "@/lib/email/types";

function createLogId(): string {
  return `eml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function recordDelivery(
  input: SendEmailInput,
  result: SendEmailResult
): Promise<void> {
  await persistEmailDeliveryLog({
    id: createLogId(),
    toEmail: input.to,
    subject: input.subject,
    trigger: input.trigger,
    provider: result.provider,
    status: result.skipped ? "skipped" : result.sent ? "sent" : result.error ? "failed" : "queued",
    messageId: result.messageId,
    errorMessage: result.error ?? result.skipReason,
    payloadSummary: {
      locale: input.locale,
      providerLabel: getEmailProviderLabel(result.provider),
    },
    createdAt: new Date().toISOString(),
  });
}

/**
 * Unified email transport — Resend when configured, otherwise safe console fallback.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = input.to?.trim();
  if (!to || !isValidEmailAddress(to)) {
    const result: SendEmailResult = {
      queued: false,
      sent: false,
      provider: resolveActiveEmailProvider(),
      skipped: true,
      skipReason: "invalid-recipient",
    };
    await recordDelivery({ ...input, to: to ?? "" }, result);
    return result;
  }

  if (isEmailConsoleMode()) {
    console.info("[email] console transport", {
      to,
      subject: input.subject,
      trigger: input.trigger,
      locale: input.locale,
      preview: input.text ?? input.html.slice(0, 180),
    });

    const result: SendEmailResult = {
      queued: true,
      sent: false,
      provider: "console",
    };
    await recordDelivery(input, result);
    return result;
  }

  const resendResult = await sendViaResend({
    ...input,
    to,
    replyTo: input.replyTo ?? resolveResendReplyTo(),
  });

  if (!resendResult.ok) {
    console.error("[email] Resend failed", {
      to,
      subject: input.subject,
      trigger: input.trigger,
      error: resendResult.error,
    });

    const result: SendEmailResult = {
      queued: false,
      sent: false,
      provider: "resend",
      error: resendResult.error,
    };
    await recordDelivery(input, result);
    return result;
  }

  const result: SendEmailResult = {
    queued: true,
    sent: true,
    provider: "resend",
    messageId: resendResult.messageId,
  };
  await recordDelivery(input, result);
  return result;
}

export type { SendEmailInput, SendEmailResult } from "@/lib/email/types";
