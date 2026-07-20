import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import { enrichAuthUser, resolveAuthUser, buildAuthUserFromMetadata } from "@/lib/auth/supabase-account";
import {
  logAuthFailure,
  logAuthRequest,
  logSupabaseLoginError,
} from "@/lib/auth/auth-diagnostics";
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
      email?: string;
      password?: string;
      totpCode?: string;
    };

    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const email = body.email.trim();
    logAuthRequest("login", { email, ip });

    if (!isSupabaseConfigured()) {
      logAuthFailure("login", "supabase-not-configured", { email });
      return NextResponse.json(
        { error: "Login is unavailable. Supabase authentication is not configured for this deployment." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (error || !data.user) {
      if (error) {
        logSupabaseLoginError(error, email);
      } else {
        logAuthFailure("login", "supabase-no-user-returned", { email });
      }

      await serverDispatchNotification(
        buildTriggerNotification({
          trigger: "failed_login",
          title: "Failed Login Attempt",
          body: `Failed login for ${email} from ${ip}`,
          isCritical: true,
          href: "/admin/security",
        }),
        { ownerEmail: true }
      );
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let authUser = buildAuthUserFromMetadata(data.user);
    try {
      authUser = (await resolveAuthUser(data.user)) ?? authUser;
    } catch (resolveError) {
      logAuthFailure("login", "profile-sync-failed", {
        email,
        userId: data.user.id,
        message: resolveError instanceof Error ? resolveError.message : String(resolveError),
      });
    }

    if (!authUser || authUser.isBanned) {
      await supabase.auth.signOut();
      logAuthFailure("login", "account-suspended", { email, userId: data.user.id });
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    console.info("[auth/login] success", {
      email,
      userId: data.user.id,
      role: authUser.role,
    });

    const response = NextResponse.json({ user: enrichAuthUser(authUser) });
    clearLegacySessionCookie(response);
    return response;
  } catch (err) {
    logAuthFailure("login", "unexpected-error", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
