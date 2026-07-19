import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/jwt";
import { hashPassword, validatePassword } from "@/lib/security/password";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import {
  createSession,
  findAccountByEmail,
  initDemoAccounts,
  registerDemoUser,
  toPublicUser,
} from "@/lib/security/demo-store";
import { checkMultiAccount } from "@/lib/security/anti-abuse";
import { createProfileForAccount } from "@/lib/profile/profile-store";
import { persistSession } from "@/lib/security/auth-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:signup:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    await initDemoAccounts(hashPassword);
    const body = await request.json() as {
      email: string;
      password: string;
      fullName: string;
      role?: "registered" | "professional" | "company";
      gender?: "male" | "female";
      fingerprint?: string;
      dataProcessingConsent?: boolean;
    };

    if (!body.dataProcessingConsent) {
      return NextResponse.json(
        { error: "Data processing consent required (GDPR/PDPL compliance)" },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(body.password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.errors.join(". ") }, { status: 400 });
    }

    if (findAccountByEmail(body.email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const role = body.role ?? "registered";
    if (role !== "company" && !body.gender) {
      return NextResponse.json({ error: "Gender selection is required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    const accountId = `user-${Date.now()}`;
    const link = createProfileForAccount({
      accountId,
      fullName: body.fullName,
      email: body.email,
      role,
      gender: body.gender,
      hasFreelancerStore: role === "professional",
    });

    const account = registerDemoUser({
      id: accountId,
      email: body.email,
      fullName: body.fullName,
      passwordHash,
      role,
      gender: body.gender,
      profileSlug: link.profileSlug,
      storeSlug: link.storeSlug,
    });

    if (body.fingerprint) {
      const abuse = checkMultiAccount(body.fingerprint, account.id);
      if (abuse.flagged) {
        return NextResponse.json({ error: abuse.message }, { status: 403 });
      }
    }

    const ua = request.headers.get("user-agent") ?? "unknown";
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
      role: account.role,
      sessionId,
    });

    const response = NextResponse.json({ user: toPublicUser(account) });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
