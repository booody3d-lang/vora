import "server-only";

import { resolveResendApiKey } from "@/lib/email/config";
import type { EmailProviderId } from "@/lib/email/types";

function readForcedTransport(): EmailProviderId | "auto" {
  const raw = process.env.EMAIL_TRANSPORT_MODE?.trim().toLowerCase();
  if (!raw || raw === "auto") return "auto";
  if (raw === "console" || raw === "log") return "console";
  if (raw === "resend") return "resend";
  return "auto";
}

export function resolveActiveEmailProvider(): EmailProviderId {
  const forced = readForcedTransport();
  if (forced === "console") return "console";
  if (forced === "resend") {
    return resolveResendApiKey() ? "resend" : "console";
  }
  return resolveResendApiKey() ? "resend" : "console";
}

export function isEmailConsoleMode(): boolean {
  return resolveActiveEmailProvider() === "console";
}

export function getEmailProviderLabel(provider: EmailProviderId = resolveActiveEmailProvider()): string {
  return provider === "resend" ? "Resend" : "Console (simulation)";
}
