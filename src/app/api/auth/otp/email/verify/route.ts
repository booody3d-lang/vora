import { NextRequest, NextResponse } from "next/server";
import { verifyOtpDelivery } from "@/lib/auth/otp-store";
import { isValidEmailAddress } from "@/lib/email/config";
import type { OtpPurpose } from "@/types/auth-phone";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";

const OTP_PURPOSES = new Set<OtpPurpose>(["login", "signup", "2fa", "password_reset"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      purpose?: string;
    };

    const email = body.email?.trim().toLowerCase();
    if (!email || !isValidEmailAddress(email) || body.code?.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const purpose = (body.purpose ?? "login") as OtpPurpose;
    if (!OTP_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`otp-email-verify:${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many verification attempts." },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rateLimit),
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    const result = await verifyOtpDelivery({
      phone: email,
      code: body.code,
      purpose,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      email,
      purpose,
    });
  } catch {
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
