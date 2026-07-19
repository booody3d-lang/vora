import { NextResponse } from "next/server";

import {

  COOKIE_NAME,

  sessionCookieOptions,

  signSessionToken,

} from "@/lib/security/jwt";

import { hashPassword } from "@/lib/security/password";

import { verifyAccountPassword, bootstrapOwnerCredentials, bootstrapManualTestUser } from "@/lib/security/account-password";

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

  toPublicUser,

  type DemoAccount,

} from "@/lib/security/demo-store";

import { buildTriggerNotification } from "@/lib/notifications/triggers";

import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";

import { resolveEffectiveRole } from "@/lib/security/roles";

import { persistSession } from "@/lib/security/auth-store";



async function issueSessionForAccount(account: DemoAccount, request: Request) {

  const ip = getClientIp(request);

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

  const effectiveRole = resolveEffectiveRole(account);

  const token = await signSessionToken({

    sub: account.id,

    email: account.email,

    role: effectiveRole,

    sessionId,

  });

  const response = NextResponse.json({

    user: { ...toPublicUser(account), role: effectiveRole },

    devBypass: false,

  });

  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());

  return response;

}



export async function POST(request: Request) {

  const ip = getClientIp(request);

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



  try {

    await initDemoAccounts(hashPassword);

    await bootstrapOwnerCredentials();
    await bootstrapManualTestUser();

    const body = await request.json() as {

      email: string;

      password?: string;

      totpCode?: string;

      fingerprint?: string;

      devMock?: boolean;

    };



    const account = findAccountByEmail(body.email);



    if (!account || !body.password || !(await verifyAccountPassword(account.id, body.password))) {

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

