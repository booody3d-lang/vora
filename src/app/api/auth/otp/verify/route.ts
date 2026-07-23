import { NextRequest, NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import { resolvePhoneLoginSession } from "@/lib/auth/phone-auth-supabase";
import { verifyOtpDelivery } from "@/lib/auth/otp-store";
import { normalizePhoneFromRequest } from "@/lib/auth/phone/detect-country";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { persistLoginSession } from "@/lib/auth/persist-login-session";
import { recordUserSession } from "@/lib/auth/sessions-store";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/jwt";
import {
  createSession,
  findAccountByPhone,
  initDemoAccounts,
  registerDemoUser,
  toPublicUser,
} from "@/lib/security/demo-store";
import { hashPassword } from "@/lib/security/password";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { OtpPurpose } from "@/types/auth-phone";

const OTP_PURPOSES = new Set<OtpPurpose>(["login", "signup", "2fa", "password_reset"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      countryCode?: string;
      code?: string;
      fullName?: string;
      purpose?: string;
    };

    if (!body.phone?.trim() || body.phone.trim().length < 6 || body.code?.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const purpose = (body.purpose ?? "login") as OtpPurpose;
    if (!OTP_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`otp-verify:${ip}`, RATE_LIMITS.auth);
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

    const normalized = normalizePhoneFromRequest(body.phone, request, body.countryCode);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await verifyOtpDelivery({
      phone: normalized.e164,
      code: body.code,
      purpose,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (isSupabaseConfigured()) {
      const sessionResult = await resolvePhoneLoginSession({
        phoneE164: normalized.e164,
        fullName: body.fullName,
      });

      if (!sessionResult.ok) {
        return NextResponse.json(
          { error: sessionResult.error },
          { status: sessionResult.status }
        );
      }

      await persistLoginSession(request, sessionResult.authUser.id);

      const response = NextResponse.json({
        ok: true,
        verified: true,
        phone: normalized.e164,
        purpose,
        user: sessionResult.authUser,
      });
      clearLegacySessionCookie(response);
      return response;
    }

    await initDemoAccounts(hashPassword);

    let account = findAccountByPhone(normalized.e164);
    if (!account) {
      account = registerDemoUser({
        email: `${normalized.e164.replace("+", "")}@phone.vora.sa`,
        fullName: body.fullName ?? "VORA User",
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: "registered",
      });
      account.phone = normalized.e164;
      account.phoneVerified = true;
    }

    const ua = request.headers.get("user-agent") ?? "unknown";
    const effectiveRole = resolveEffectiveRole(account);
    const { sessionId } = createSession(account.id, { userAgent: ua, ip });
    await recordUserSession({
      accountId: account.id,
      sessionToken: sessionId,
      userAgent: ua,
      ip,
    });
    const token = await signSessionToken({
      sub: account.id,
      email: account.email,
      role: effectiveRole,
      sessionId,
    });

    const response = NextResponse.json({
      ok: true,
      verified: true,
      phone: normalized.e164,
      purpose,
      user: { ...toPublicUser(account), role: effectiveRole },
    });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
