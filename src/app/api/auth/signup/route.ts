import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import {
  enrichAuthUser,
  ensureLocalProfile,
  resolveAuthUser,
  upsertAccountRow,
  buildAuthUserFromMetadata,
} from "@/lib/auth/supabase-account";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { hashPassword, validatePassword } from "@/lib/security/password";
import {
  createSession,
  findAccountByEmail,
  initDemoAccounts,
  registerDemoUser,
  toPublicUser,
} from "@/lib/security/demo-store";
import { checkMultiAccount } from "@/lib/security/anti-abuse";
import { createProfileForAccount } from "@/lib/profile/profile-store";
import { persistSession, storePasswordHash } from "@/lib/security/auth-store";
import { COOKIE_NAME, sessionCookieOptions, signSessionToken } from "@/lib/security/jwt";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { UserGender } from "@/types/profile";

function parseGender(value: unknown): UserGender | null {
  if (value === "male" || value === "female") return value;
  return null;
}

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
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: "registered" | "professional" | "company";
      gender?: unknown;
      fingerprint?: string;
      dataProcessingConsent?: boolean;
    };

    if (!body.dataProcessingConsent) {
      return NextResponse.json(
        { error: "Data processing consent required (GDPR/PDPL compliance)" },
        { status: 400 }
      );
    }

    if (!body.email?.trim() || !body.password || !body.fullName?.trim()) {
      return NextResponse.json({ error: "Full name, email, and password are required" }, { status: 400 });
    }

    const pwCheck = validatePassword(body.password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.errors.join(". ") }, { status: 400 });
    }

    const role = body.role ?? "registered";
    const gender = parseGender(body.gender);
    if (role !== "company" && !gender) {
      return NextResponse.json({ error: "Gender selection is required" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email: body.email.trim(),
        password: body.password,
        options: {
          data: {
            full_name: body.fullName.trim(),
            role,
            gender: gender ?? null,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }
        console.error("[auth/signup] supabase:", error.message);
        return NextResponse.json({ error: error.message || "Signup failed" }, { status: 400 });
      }

      if (!data.user) {
        return NextResponse.json({ error: "Signup failed" }, { status: 500 });
      }

      const authUser = buildAuthUserFromMetadata(data.user);
      authUser.fullName = body.fullName.trim();
      authUser.role = role;
      authUser.gender = gender ?? undefined;
      authUser.professionalUnlocked = role === "professional";
      authUser.hasFreelancerStore = role === "professional";
      authUser.hasProfessionalProfile = role !== "company";

      await upsertAccountRow(authUser);
      ensureLocalProfile(authUser);

      if (body.fingerprint) {
        const abuse = checkMultiAccount(body.fingerprint, authUser.id);
        if (abuse.flagged) {
          await supabase.auth.signOut();
          return NextResponse.json({ error: abuse.message }, { status: 403 });
        }
      }

      if (!data.session) {
        const response = NextResponse.json({
          requiresEmailConfirmation: true,
          message: "Check your email to confirm your account before signing in.",
        });
        clearLegacySessionCookie(response);
        return response;
      }

      const resolved = await resolveAuthUser(data.user);
      const response = NextResponse.json({
        user: enrichAuthUser(resolved ?? authUser),
      });
      clearLegacySessionCookie(response);
      return response;
    }

    await initDemoAccounts(hashPassword);

    if (findAccountByEmail(body.email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const accountId = `user-${Date.now()}`;
    const link = createProfileForAccount({
      accountId,
      fullName: body.fullName.trim(),
      email: body.email.trim(),
      role,
      gender: gender ?? undefined,
      hasFreelancerStore: role === "professional",
    });

    const account = registerDemoUser({
      id: accountId,
      email: body.email.trim(),
      fullName: body.fullName.trim(),
      passwordHash,
      role,
      gender: gender ?? undefined,
      profileSlug: link.profileSlug,
      storeSlug: link.storeSlug,
    });

    storePasswordHash(account.id, passwordHash);

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

    const effectiveRole = resolveEffectiveRole(account);
    const token = await signSessionToken({
      sub: account.id,
      email: account.email,
      role: effectiveRole,
      sessionId,
    });

    const response = NextResponse.json({ user: { ...toPublicUser(account), role: effectiveRole } });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
