import { NextResponse } from "next/server";
import {
  createPasswordResetRequest,
  getRecoveryChannel,
  setRecoveryChannel,
  type RecoveryChannel,
} from "@/lib/security/auth-store";
import { findAccountByEmail, findAccountByPhone } from "@/lib/security/demo-store";
import { generateOtpCode, hashOtp, normalizeSaudiPhone } from "@/lib/security/otp";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:forgot:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = (await request.json()) as {
      emailOrPhone?: string;
      channel?: RecoveryChannel;
    };

    const identifier = body.emailOrPhone?.trim();
    if (!identifier) {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
    }

    const normalizedPhone = normalizeSaudiPhone(identifier);
    const account =
      findAccountByEmail(identifier) ??
      (normalizedPhone ? findAccountByPhone(normalizedPhone) : undefined);

    // Always respond generically to avoid account enumeration
    const genericResponse = {
      ok: true,
      message: "If an account exists, a recovery code has been sent.",
    };

    if (!account) {
      return NextResponse.json(genericResponse);
    }

    const preferredChannel = body.channel ?? getRecoveryChannel(account.id);
    if (body.channel) {
      setRecoveryChannel(account.id, body.channel);
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    const { token, expiresAt } = createPasswordResetRequest({
      accountId: account.id,
      email: account.email,
      channel: preferredChannel,
      codeHash,
    });

    const resetPath = `/auth/reset-password?token=${encodeURIComponent(token)}`;
    const bodyText =
      preferredChannel === "sms"
        ? `Your VORA password reset code is ${code}. It expires in 30 minutes.`
        : `Your VORA password reset code is ${code}. Use token ${token} or visit ${resetPath} before ${expiresAt}.`;

    await serverDispatchNotification(
      buildTriggerNotification({
        trigger: "password_reset",
        title: "Password Reset Request",
        body: bodyText,
        href: resetPath,
        channels: preferredChannel === "sms" ? ["in_app"] : ["email", "in_app"],
      }),
      {
        recipientEmail: preferredChannel === "email" ? account.email : undefined,
      }
    );

    if (preferredChannel === "sms" && account.phone) {
      console.info(`[VORA SMS] To: ${account.phone} | Password reset code: ${code}`);
    }

    return NextResponse.json({
      ...genericResponse,
      token,
      channel: preferredChannel,
      expiresAt,
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to process reset request" }, { status: 500 });
  }
}
