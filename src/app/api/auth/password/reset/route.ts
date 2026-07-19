import { NextResponse } from "next/server";
import { resetAccountPassword } from "@/lib/security/account-password";
import {
  getPasswordResetRequest,
  markPasswordResetUsed,
} from "@/lib/security/auth-store";
import { verifyOtp } from "@/lib/security/otp";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:reset:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many reset attempts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = (await request.json()) as {
      token?: string;
      code?: string;
      newPassword?: string;
    };

    if (!body.token || !body.code || !body.newPassword) {
      return NextResponse.json(
        { error: "Token, code, and new password are required" },
        { status: 400 }
      );
    }

    const resetRequest = getPasswordResetRequest(body.token);
    if (!resetRequest || resetRequest.used) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    if (new Date(resetRequest.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
    }

    const codeValid = await verifyOtp(body.code, resetRequest.codeHash);
    if (!codeValid) {
      return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
    }

    const result = await resetAccountPassword(resetRequest.accountId, body.newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    markPasswordResetUsed(body.token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
