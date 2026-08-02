import { NextRequest, NextResponse } from "next/server";
import { resolveActiveOtpProviderId } from "@/lib/auth/otp-provider";
import { sendEmailOtpDelivery } from "@/lib/auth/otp-store";
import { isValidEmailAddress } from "@/lib/email/config";
import { isStrictProduction } from "@/lib/env/validate";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import type { OtpPurpose } from "@/types/auth-phone";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";

const OTP_PURPOSES = new Set<OtpPurpose>(["login", "signup", "2fa", "password_reset"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      purpose?: string;
    };

    const email = body.email?.trim().toLowerCase();
    if (!email || !isValidEmailAddress(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const purpose = (body.purpose ?? "login") as OtpPurpose;
    if (!OTP_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`otp-email-send:${ip}`, RATE_LIMITS.otp);
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

    if (isStrictProduction() && resolveActiveOtpProviderId() !== "resend") {
      return NextResponse.json(
        { error: "Email OTP requires OTP_PROVIDER=resend in production" },
        { status: 503 }
      );
    }

    const result = await sendEmailOtpDelivery({
      email,
      purpose,
      ipAddress: ip,
    });

    return NextResponse.json({
      ok: true,
      message: "Verification code sent to your email",
      channel: result.channel,
      provider: result.provider,
      expiresIn: 300,
      ...(result.demoCode ? { demoCode: result.demoCode, devCode: result.demoCode } : {}),
    });
  } catch (error) {
    if (error instanceof NotificationProviderNotReadyError) {
      return NextResponse.json(
        { error: error.message, reasons: error.reasons },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
