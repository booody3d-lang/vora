import { NextResponse } from "next/server";
import { normalizePhoneFromRequest } from "@/lib/auth/phone/detect-country";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/jwt";
import { verifyOtp } from "@/lib/security/otp";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import {
  clearOtp,
  createSession,
  findAccountByPhone,
  getOtp,
  incrementOtpAttempts,
  initDemoAccounts,
  registerDemoUser,
  toPublicUser,
} from "@/lib/security/demo-store";
import { hashPassword } from "@/lib/security/password";
import { resolveEffectiveRole } from "@/lib/security/roles";
import { persistSession } from "@/lib/security/auth-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:otp-verify:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  try {
    await initDemoAccounts(hashPassword);
    const body = await request.json() as { phone: string; code: string; fullName?: string; countryCode?: string };
    const normalized = normalizePhoneFromRequest(body.phone, request, body.countryCode);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    const phone = normalized.e164;

    const otpEntry = getOtp(phone);
    if (!otpEntry || Date.now() > otpEntry.expiresAt) {
      return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
    }

    if (otpEntry.attempts >= 5) {
      return NextResponse.json({ error: "Too many OTP attempts" }, { status: 429 });
    }

    if (!(await verifyOtp(body.code, otpEntry.codeHash))) {
      incrementOtpAttempts(phone);
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 401 });
    }

    clearOtp(phone);

    let account = findAccountByPhone(phone);
    if (!account) {
      account = registerDemoUser({
        email: `${phone.replace("+", "")}@phone.vora.sa`,
        fullName: body.fullName ?? "VORA User",
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: "registered",
      });
      account.phone = phone;
      account.phoneVerified = true;
    }

    const ua = request.headers.get("user-agent") ?? "unknown";
    const effectiveRole = resolveEffectiveRole(account);
    const { sessionId, session } = createSession(account.id, { userAgent: ua, ip });
    persistSession({
      sessionId,
      accountId: account.id,
      userAgent: ua,
      ip,
      deviceLabel: session.deviceLabel,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
    });
    const token = await signSessionToken({
      sub: account.id,
      email: account.email,
      role: effectiveRole,
      sessionId,
    });

    const response = NextResponse.json({ user: { ...toPublicUser(account), role: effectiveRole } });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "OTP verification failed" }, { status: 500 });
  }
}
