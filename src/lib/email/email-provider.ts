import "server-only";

import { isResendConfigured, resolveResendApiKey } from "@/lib/email/config";
import { isStrictProduction } from "@/lib/env/validate";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import type { EmailProviderId } from "@/lib/email/types";

export type EmailTransportMode = EmailProviderId | "auto";

const EMAIL_PROVIDER_LABELS: Record<EmailProviderId, string> = {
  console: "Console (simulation)",
  resend: "Resend",
};

export function readEmailTransportMode(): EmailTransportMode {
  const raw = process.env.EMAIL_TRANSPORT_MODE?.trim().toLowerCase();
  if (!raw || raw === "auto") return "auto";
  if (raw === "console" || raw === "log") return "console";
  if (raw === "resend") return "resend";
  return "auto";
}

/** Resolve which email backend should handle delivery today. */
export function resolveActiveEmailProvider(): EmailProviderId {
  const forced = readEmailTransportMode();
  if (forced === "console") return "console";
  if (forced === "resend") {
    return isResendConfigured() ? "resend" : "console";
  }
  return isResendConfigured() ? "resend" : "console";
}

export function isEmailConsoleMode(): boolean {
  return resolveActiveEmailProvider() === "console";
}

export function getEmailProviderLabel(provider: EmailProviderId = resolveActiveEmailProvider()): string {
  return EMAIL_PROVIDER_LABELS[provider];
}

function collectEmailReadinessReasons(): string[] {
  const reasons: string[] = [];
  const activeProvider = resolveActiveEmailProvider();

  if (activeProvider === "console") {
    if (isStrictProduction()) {
      reasons.push("Console email fallback is disabled in production");
    }
    return reasons;
  }

  if (!isResendConfigured()) {
    reasons.push("Resend API key is required for email delivery");
  }

  return reasons;
}

export function assertEmailProviderReady(): void {
  if (!isStrictProduction()) return;

  if (resolveActiveEmailProvider() === "console") {
    throw new NotificationProviderNotReadyError("email", collectEmailReadinessReasons());
  }

  const reasons = collectEmailReadinessReasons();
  if (reasons.length > 0) {
    throw new NotificationProviderNotReadyError("email", reasons);
  }
}

export { resolveResendApiKey };
