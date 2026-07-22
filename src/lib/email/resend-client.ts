import "server-only";

import { Resend } from "resend";
import { resolveResendApiKey, resolveResendFromEmail, resolveResendReplyTo } from "@/lib/email/config";
import type { SendEmailInput } from "@/lib/email/types";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = resolveResendApiKey();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendViaResend(
  input: SendEmailInput
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const client = getResendClient();
  if (!client) {
    return { ok: false, error: "Resend is not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: resolveResendFromEmail(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? resolveResendReplyTo(),
    });

    if (error) {
      return { ok: false, error: error.message ?? "Resend send failed" };
    }

    return { ok: true, messageId: data?.id ?? `resend-${Date.now()}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend send failed";
    return { ok: false, error: message };
  }
}
