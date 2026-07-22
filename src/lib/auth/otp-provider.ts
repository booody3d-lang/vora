import "server-only";

import type { OtpDeliveryChannel, OtpPurpose } from "@/types/auth-phone";

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
  readonly name: string;
  send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}

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

export class ConsoleOtpProvider implements OtpProvider {
  readonly name = "console";

  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    const message = buildOtpMessage(request);
    console.info(
      `[VORA OTP:${request.channel}] ${request.phoneE164} → ${request.code} (${request.purpose}) :: ${message}`
    );

    return {
      channel: request.channel,
      demoCode: process.env.NODE_ENV === "production" ? undefined : request.code,
      providerRef: `console-${Date.now()}`,
    };
  }
}

export class TwilioOtpProvider implements OtpProvider {
  readonly name = "twilio";

  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const smsFrom = process.env.TWILIO_SMS_FROM;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

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
      throw new Error(payload.message ?? "Twilio OTP delivery failed");
    }

    return {
      channel: request.channel,
      providerRef: payload.sid,
    };
  }
}

export function getConfiguredOtpProvider(): OtpProvider {
  const provider = (process.env.OTP_PROVIDER ?? "console").toLowerCase();

  if (provider === "twilio") {
    return new TwilioOtpProvider();
  }

  return new ConsoleOtpProvider();
}

export function isTwilioOtpConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}
