import { NextRequest, NextResponse } from "next/server";
import { sendOtpDelivery } from "@/lib/auth/otp-store";
import { normalizePhoneFromRequest } from "@/lib/auth/phone/detect-country";
import type { OtpDeliveryChannel, OtpPurpose } from "@/types/auth-phone";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";

const OTP_PURPOSES = new Set<OtpPurpose>(["login", "signup", "2fa", "password_reset"]);
const OTP_CHANNELS = new Set<OtpDeliveryChannel>(["sms", "whatsapp"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      countryCode?: string;
      channel?: string;
      purpose?: string;
    };

    if (!body.phone?.trim() || body.phone.trim().length < 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const purpose = (body.purpose ?? "login") as OtpPurpose;
    if (!OTP_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const channel = (body.channel ?? "sms") as OtpDeliveryChannel;
    if (!OTP_CHANNELS.has(channel)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`otp-send:${ip}`, RATE_LIMITS.otp);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait." },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rateLimit),
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    const normalized = normalizePhoneFromRequest(body.phone, request, body.countryCode);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await sendOtpDelivery({
      phone: normalized.e164,
      purpose,
      channel,
      ipAddress: ip,
    });

    return NextResponse.json({
      ok: true,
      message: "OTP sent",
      channel: result.channel,
      provider: result.provider,
      expiresIn: 300,
      ...(result.demoCode ? { demoCode: result.demoCode, devCode: result.demoCode } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
