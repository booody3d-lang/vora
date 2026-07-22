import { NextResponse } from "next/server";
import {
  generateOtpCode,
  hashOtp,
  normalizeSaudiPhone,
} from "@/lib/security/otp";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { storeOtp } from "@/lib/security/demo-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:otp:${ip}`, RATE_LIMITS.otp);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "OTP rate limit exceeded. Wait 15 minutes." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json() as { phone: string; purpose?: string };
    const phone = normalizeSaudiPhone(body.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Invalid Saudi mobile number. Use format 05XXXXXXXX or +9665XXXXXXXX" },
        { status: 400 }
      );
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    storeOtp(phone, codeHash);

    // Demo: return code in response. Production: send via SMS gateway (STC/Mobily/Zain)
    console.info(`[VORA OTP] ${phone} → ${code} (${body.purpose ?? "login"})`);

    return NextResponse.json({
      success: true,
      phone,
      message: "OTP sent via SMS (Saudi telecom networks)",
    });
  } catch {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
