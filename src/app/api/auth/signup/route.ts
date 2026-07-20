import { NextResponse } from "next/server";
import { clearLegacySessionCookie } from "@/lib/auth/legacy-cookie";
import {
  enrichAuthUser,
  ensureLocalProfile,
  resolveAuthUser,
  upsertAccountRow,
  buildAuthUserFromMetadata,
} from "@/lib/auth/supabase-account";
import {
  cleanupStaleAccountRowForEmail,
  getSupabaseAuthDiagnostics,
  inspectSignupEmailConflict,
  isDuplicateSignupError,
  isDuplicateSignupUser,
  logAuthFailure,
  logAuthRequest,
  logSignupConflict,
  logSupabaseSignupError,
} from "@/lib/auth/auth-diagnostics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { validatePassword } from "@/lib/security/password";
import { checkMultiAccount } from "@/lib/security/anti-abuse";
import type { UserGender } from "@/types/profile";

function parseGender(value: unknown): UserGender | null {
  if (value === "male" || value === "female") return value;
  return null;
}

async function respondEmailAlreadyRegistered(
  email: string,
  reason: string,
  extra?: Record<string, unknown>
) {
  const diagnostics = await inspectSignupEmailConflict(email);
  logSignupConflict(reason, diagnostics, extra);
  return NextResponse.json({ error: "Email already registered" }, { status: 409 });
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

    const email = body.email.trim();
    logAuthRequest("signup", { email, role, ip });

    if (!isSupabaseConfigured()) {
      logAuthFailure("signup", "supabase-not-configured");
      return NextResponse.json(
        { error: "Signup is unavailable. Supabase authentication is not configured for this deployment." },
        { status: 503 }
      );
    }

    await cleanupStaleAccountRowForEmail(email);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
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
      const diagnostics = await inspectSignupEmailConflict(email);
      logSupabaseSignupError(error, diagnostics);

      if (isDuplicateSignupError(error)) {
        return await respondEmailAlreadyRegistered(email, "supabase-auth-duplicate", {
          supabaseError: error.message,
          supabaseStatus: error.status,
          supabaseCode: error.code,
        });
      }

      return NextResponse.json({ error: error.message || "Signup failed" }, { status: 400 });
    }

    if (!data.user) {
      logAuthFailure("signup", "supabase-no-user-returned", { email });
      return NextResponse.json({ error: "Signup failed" }, { status: 500 });
    }

    if (isDuplicateSignupUser(data.user)) {
      return await respondEmailAlreadyRegistered(email, "supabase-empty-identities", {
        userId: data.user.id,
      });
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
      console.info("[auth/signup] email confirmation required", {
        email,
        userId: data.user.id,
        ...getSupabaseAuthDiagnostics(),
      });
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
  } catch (error) {
    logAuthFailure("signup", "unexpected-error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
