import "server-only";

import { isStrictProduction } from "@/lib/env/validate";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import type { OtpDeliveryChannel, OtpPurpose } from "@/types/auth-phone";

export type OtpProviderId = "console" | "twilio";

export interface OtpDeliveryRequest {
  phoneE164: string;
  code: string;
  channel: OtpDeliveryChannel;
  purpose: OtpPurpose;
}

export interface OtpDeliveryResult {
  providerRef?: string;
  demoCode?: string;
  channel: OtpDeliveryChannel;
}

export interface OtpProvider {
  readonly name: OtpProviderId;
  send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}

const OTP_PROVIDER_LABELS: Record<OtpProviderId, string> = {
  console: "Console (simulation)",
  twilio: "Twilio",
};

function buildOtpMessage(request: OtpDeliveryRequest): string {
  const purposeLabel =
    request.purpose === "login"
      ? "sign-in"
      : request.purpose === "signup"
        ? "registration"
        : request.purpose === "password_reset"
          ? "password reset"
          : "verification";

  if (request.channel === "whatsapp") {
    return `Your VORA ${purposeLabel} code is ${request.code}. It expires in 5 minutes.`;
  }

  return `VORA ${purposeLabel} code: ${request.code}. Valid for 5 minutes.`;
}

export function readOtpProviderMode(): OtpProviderId | "auto" {
  const raw = process.env.OTP_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "auto") return "auto";
  if (raw === "console" || raw === "log") return "console";
  if (raw === "twilio") return "twilio";
  return "auto";
}

export function isTwilioOtpConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim()
  );
}

export function isTwilioWhatsappConfigured(): boolean {
  return Boolean(isTwilioOtpConfigured() && process.env.TWILIO_WHATSAPP_FROM?.trim());
}

/** Resolve which OTP backend should handle delivery today. */
export function resolveActiveOtpProviderId(): OtpProviderId {
  const forced = readOtpProviderMode();
  if (forced === "console") return "console";
  if (forced === "twilio" && isTwilioOtpConfigured()) return "twilio";
  if (isTwilioOtpConfigured()) return "twilio";
  return "console";
}

export function isOtpConsoleMode(): boolean {
  return resolveActiveOtpProviderId() === "console";
}

export function getOtpProviderLabel(provider: OtpProviderId = resolveActiveOtpProviderId()): string {
  return OTP_PROVIDER_LABELS[provider];
}

function collectOtpReadinessReasons(channel: OtpDeliveryChannel = "sms"): string[] {
  const reasons: string[] = [];
  const activeProvider = resolveActiveOtpProviderId();

  if (activeProvider === "console") {
    if (isStrictProduction()) {
      reasons.push("Console OTP fallback is disabled in production");
    }
    return reasons;
  }

  if (!process.env.TWILIO_ACCOUNT_SID?.trim() || !process.env.TWILIO_AUTH_TOKEN?.trim()) {
    reasons.push("Twilio credentials are incomplete");
  }
  if (channel === "sms" && !process.env.TWILIO_SMS_FROM?.trim()) {
    reasons.push("TWILIO_SMS_FROM is required for SMS OTP delivery");
  }
  if (channel === "whatsapp" && !process.env.TWILIO_WHATSAPP_FROM?.trim()) {
    reasons.push("TWILIO_WHATSAPP_FROM is required for WhatsApp OTP delivery");
  }

  return reasons;
}

export function assertOtpProviderReady(channel: OtpDeliveryChannel = "sms"): void {
  if (!isStrictProduction()) return;

  const activeProvider = resolveActiveOtpProviderId();
  if (activeProvider !== "console") {
    const reasons = collectOtpReadinessReasons(channel);
    if (reasons.length > 0) {
      throw new NotificationProviderNotReadyError("otp", reasons);
    }
    return;
  }

  throw new NotificationProviderNotReadyError("otp", collectOtpReadinessReasons(channel));
}

export class ConsoleOtpProvider implements OtpProvider {
  readonly name = "console";

  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    if (isStrictProduction()) {
      throw new NotificationProviderNotReadyError("otp", collectOtpReadinessReasons(request.channel));
    }

    const message = buildOtpMessage(request);
    console.info(
      `[VORA OTP:${request.channel}] ${request.phoneE164} → ${request.code} (${request.purpose}) :: ${message}`
    );

    return {
      channel: request.channel,
      demoCode: request.code,
      providerRef: `console-${Date.now()}`,
    };
  }
}

export class TwilioOtpProvider implements OtpProvider {
  readonly name = "twilio";

  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const smsFrom = process.env.TWILIO_SMS_FROM?.trim();
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials are not configured");
    }

    const message = buildOtpMessage(request);
    const useWhatsApp = request.channel === "whatsapp";

    const from = useWhatsApp ? whatsappFrom : smsFrom;
    if (!from) {
      throw new Error(
        useWhatsApp
          ? "TWILIO_WHATSAPP_FROM is not configured"
          : "TWILIO_SMS_FROM is not configured"
      );
    }

    const to = useWhatsApp
      ? request.phoneE164.startsWith("whatsapp:")
        ? request.phoneE164
        : `whatsapp:${request.phoneE164}`
      : request.phoneE164;

    const body = new URLSearchParams({
      To: to,
      From: from.startsWith("whatsapp:") || !useWhatsApp ? from : `whatsapp:${from}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const payload = (await response.json()) as { sid?: string; message?: string };
    if (!response.ok) {
      console.error("[otp] Twilio delivery failed", {
        channel: request.channel,
        purpose: request.purpose,
        status: response.status,
        error: payload.message ?? "Twilio OTP delivery failed",
      });
      throw new Error(payload.message ?? "Twilio OTP delivery failed");
    }

    return {
      channel: request.channel,
      providerRef: payload.sid,
    };
  }
}

export function getConfiguredOtpProvider(): OtpProvider {
  const provider = resolveActiveOtpProviderId();

  if (provider === "twilio") {
    return new TwilioOtpProvider();
  }

  if (isStrictProduction()) {
    throw new NotificationProviderNotReadyError("otp", collectOtpReadinessReasons("sms"));
  }

  return new ConsoleOtpProvider();
}
