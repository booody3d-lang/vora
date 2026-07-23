import { NextResponse } from "next/server";
import {
  generateDevRecoveryLink,
  requestSupabasePasswordReset,
} from "@/lib/auth/supabase-password";
import { assertOtpProviderReady, getConfiguredOtpProvider } from "@/lib/auth/otp-provider";
import {
  createPasswordResetRequest,
  getRecoveryChannel,
  setRecoveryChannel,
  type RecoveryChannel,
} from "@/lib/security/auth-store";
import { findAccountByEmail, findAccountByPhone } from "@/lib/security/demo-store";
import { generateOtpCode, hashOtp, normalizeSaudiPhone } from "@/lib/security/otp";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`auth:forgot:${ip}`, RATE_LIMITS.auth);
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

    const genericResponse = {
      ok: true,
      message: "If an account exists, a recovery link has been sent.",
    };

    if (isSupabaseConfigured() && identifier.includes("@")) {
      const result = await requestSupabasePasswordReset(identifier);
      if (!result.ok) {
        console.error("[auth/forgot] supabase reset failed:", result.error);
      }

      const devRecoveryLink = await generateDevRecoveryLink(identifier);

      await serverDispatchNotification(
        buildTriggerNotification({
          trigger: "password_reset",
          title: "Password Reset Request",
          titleAr: "طلب إعادة تعيين كلمة المرور",
          body: "Use the secure link sent to your email to reset your VORA password.",
          bodyAr: "استخدم الرابط الآمن المرسل إلى بريدك لإعادة تعيين كلمة مرور VORA.",
          href: "/auth/forgot-password",
          channels: ["email", "in_app"],
        }),
        { recipientEmail: identifier }
      );

      return NextResponse.json({
        ...genericResponse,
        ...(devRecoveryLink ? { devRecoveryLink } : {}),
      });
    }

    const normalizedPhone = normalizeSaudiPhone(identifier);
    const account =
      findAccountByEmail(identifier) ??
      (normalizedPhone ? findAccountByPhone(normalizedPhone) : undefined);

    if (!account) {
      return NextResponse.json(genericResponse);
    }

    const preferredChannel = body.channel ?? getRecoveryChannel(account.id);
    if (body.channel) {
      setRecoveryChannel(account.id, body.channel);
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    createPasswordResetRequest({
      accountId: account.id,
      email: account.email,
      channel: preferredChannel,
      codeHash,
    });

    await serverDispatchNotification(
      buildTriggerNotification({
        trigger: "password_reset",
        title: "Password Reset Request",
        titleAr: "طلب إعادة تعيين كلمة المرور",
        body:
          preferredChannel === "sms"
            ? `Your VORA password reset code is ${code}. It expires in 30 minutes.`
            : "Use the password reset page after verifying your recovery code.",
        bodyAr:
          preferredChannel === "sms"
            ? `رمز إعادة تعيين كلمة المرور في VORA: ${code}. ينتهي خلال 30 دقيقة.`
            : "استخدم صفحة إعادة تعيين كلمة المرور بعد التحقق من رمز الاسترداد.",
        href: "/auth/reset-password",
        channels: preferredChannel === "sms" ? ["in_app"] : ["email", "in_app"],
      }),
      {
        recipientEmail: preferredChannel === "email" ? account.email : undefined,
        accountId: account.id,
      }
    );

    if (preferredChannel === "sms" && account.phone) {
      try {
        assertOtpProviderReady("sms");
        const provider = getConfiguredOtpProvider();
        await provider.send({
          phoneE164: account.phone,
          code,
          channel: "sms",
          purpose: "password_reset",
        });
      } catch (error) {
        if (error instanceof NotificationProviderNotReadyError) {
          return NextResponse.json(
            { error: error.message, reasons: error.reasons },
            { status: 503 }
          );
        }
        console.error("[auth/forgot] SMS delivery failed:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "Failed to send recovery SMS" }, { status: 502 });
      }
    }

    return NextResponse.json({
      ...genericResponse,
      channel: preferredChannel,
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to process reset request" }, { status: 500 });
  }
}
