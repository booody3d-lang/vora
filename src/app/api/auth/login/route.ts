import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import { enrichAuthUser, resolveAuthUser, upsertAccountRow } from "@/lib/auth/supabase-account";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import { hashPassword } from "@/lib/security/password";
import { verifyAccountPassword, bootstrapOwnerCredentials, bootstrapManualTestUser } from "@/lib/security/account-password";
import {
  createSession,
  findAccountByEmail,
  initDemoAccounts,
  toPublicUser,
  type DemoAccount,
} from "@/lib/security/demo-store";
import { resolveEffectiveRole } from "@/lib/security/roles";
import { persistSession } from "@/lib/security/auth-store";
import { COOKIE_NAME, sessionCookieOptions, signSessionToken } from "@/lib/security/jwt";

async function issueLegacySessionForAccount(account: DemoAccount, request: Request) {
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
    const body = (await request.json()) as {
      email: string;
      password?: string;
      totpCode?: string;
    };

    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email.trim(),
        password: body.password,
      });

      if (error || !data.user) {
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

      const authUser = await resolveAuthUser(data.user);
      if (!authUser || authUser.isBanned) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }

      const response = NextResponse.json({ user: enrichAuthUser(authUser) });
      clearLegacySessionCookie(response);
      return response;
    }

    await initDemoAccounts(hashPassword);
    await bootstrapOwnerCredentials();
    await bootstrapManualTestUser();

    const account = findAccountByEmail(body.email);
    if (!account || !(await verifyAccountPassword(account.id, body.password))) {
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

    return issueLegacySessionForAccount(account, request);
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
