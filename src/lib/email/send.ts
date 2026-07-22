import "server-only";

import { SITE_URL } from "@/i18n/config";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trigger?: string;
}

export interface SendEmailResult {
  queued: boolean;
  provider: "console" | "resend";
  previewUrl?: string;
}

/**
 * Email transport foundation. Uses console logging until RESEND_API_KEY is configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (resendKey) {
    // Provider hook — wire Resend (or another ESP) in a later phase without changing callers.
    console.info("[email] RESEND_API_KEY is set but provider integration is pending", {
      to: input.to,
      subject: input.subject,
      trigger: input.trigger,
      site: SITE_URL,
    });
    return { queued: true, provider: "resend" };
  }

  console.info("[email] queued (console transport)", {
    to: input.to,
    subject: input.subject,
    trigger: input.trigger,
    preview: input.text ?? input.html.slice(0, 160),
  });

  return { queued: true, provider: "console" };
}
