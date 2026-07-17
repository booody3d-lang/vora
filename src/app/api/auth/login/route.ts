import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/jwt";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import {
  createSession,
  initDemoAccounts,
  toPublicUser,
} from "@/lib/security/demo-store";
import {
  isDevAuthBypass,
  resolveDevDemoAccount,
} from "@/lib/security/dev-auth";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";

async function issueSessionForAccount(
  account: NonNullable<ReturnType<typeof resolveDevDemoAccount>>,
  request: Request
) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "unknown";
  const { sessionId } = createSession(account.id, { userAgent: ua, ip });
  const token = await signSessionToken({
    sub: account.id,
    email: account.email,
    role: account.role,
    sessionId,
  });
  const response = NextResponse.json({ user: toPublicUser(account), devBypass: isDevAuthBypass() });
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return response;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const devBypass = isDevAuthBypass();

  if (!devBypass) {
    const rl = checkRateLimit(`auth:login:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) {
      await serverDispatchNotification(
        buildTriggerNotification({
          trigger: "rate_limit_violation",
          title: "Rate Limit Violation",
          body: `Login rate limit exceeded from IP ${ip}`,
          isCritical: true,
          channels: ["in_app", "email"],
        }),
        { ownerEmail: true }
      );
      return NextResponse.json(
        { error: "Too many login attempts. Try again in 15 minutes." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }
  }

  try {
    await initDemoAccounts(hashPassword);
    const body = await request.json() as {
      email: string;
      password?: string;
      totpCode?: string;
      fingerprint?: string;
      devMock?: boolean;
    };

    const account = resolveDevDemoAccount(body.email);

    // Development: instant mock session for any known demo account (password optional)
    if (devBypass && account) {
      return issueSessionForAccount(account, request);
    }

    if (!account || !body.password || !(await verifyPassword(body.password, account.passwordHash))) {
      if (!devBypass) {
        await serverDispatchNotification(
          buildTriggerNotification({
            trigger: "failed_login",
            title: "Failed Login Attempt",
            body: `Failed login for ${body.email} from ${ip}`,
            isCritical: true,
            href: "/admin/security",
          }),
          { ownerEmail: true }
        );
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (account.isBanned) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    if (account.totpEnabled && account.totpSecret) {
      if (!body.totpCode) {
        return NextResponse.json({ requires2FA: true, method: "totp" });
      }
      const { verifyTotpCode } = await import("@/lib/security/otp");
      if (!verifyTotpCode(account.totpSecret, body.totpCode)) {
        return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
      }
    }

    return issueSessionForAccount(account, request);
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
