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
  logSignupUnhandledError,
  logSupabaseSignupError,
  prepareEmailForSignup,
  supabaseAuthErrorResponse,
  type AuthApiErrorBody,
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

function jsonError(body: AuthApiErrorBody, httpStatus: number) {
  return NextResponse.json(body, { status: httpStatus });
}

async function bootstrapProfileAfterSignup(input: {
  authUser: ReturnType<typeof buildAuthUserFromMetadata>;
  email: string;
}) {
  try {
    await upsertAccountRow(input.authUser);
    ensureLocalProfile(input.authUser);
  } catch (profileError) {
    logSignupUnhandledError(profileError, "profile-bootstrap", { email: input.email });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`auth:signup:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  let stage = "init";

  try {
    stage = "parse-body";
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
      return jsonError(
        { error: "Data processing consent required (GDPR/PDPL compliance)", stage },
        400
      );
    }

    if (!body.email?.trim() || !body.password || !body.fullName?.trim()) {
      return jsonError(
        { error: "Full name, email, and password are required", stage },
        400
      );
    }

    const pwCheck = validatePassword(body.password);
    if (!pwCheck.valid) {
      return jsonError({ error: pwCheck.errors.join(". "), stage: "validate-password" }, 400);
    }

    const role = body.role ?? "registered";
    const gender = parseGender(body.gender);
    if (role !== "company" && !gender) {
      return jsonError({ error: "Gender selection is required", stage: "validate-gender" }, 400);
    }

    const email = body.email.trim();
    logAuthRequest("signup", { email, role, ip });

    stage = "check-config";
    if (!isSupabaseConfigured()) {
      logAuthFailure("signup", "supabase-not-configured");
      return jsonError(
        {
          error: "Signup is unavailable. Supabase authentication is not configured for this deployment.",
          stage,
        },
        503
      );
    }

    stage = "prepare-email";
    await cleanupStaleAccountRowForEmail(email);
    const prep = await prepareEmailForSignup(email);
    if (prep === "exists-confirmed") {
      const diagnostics = await inspectSignupEmailConflict(email);
      logSignupConflict("confirmed-account-exists", diagnostics);
      return jsonError(
        {
          error: "Email already registered",
          code: "email_already_registered",
          messageAr: "هذا البريد مسجل مسبقاً. يرجى تسجيل الدخول.",
          action: "login",
          stage,
        },
        409
      );
    }

    stage = "create-client";
    const supabase = await createClient();

    stage = "supabase-signup";
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
        logSignupConflict("supabase-auth-duplicate", diagnostics, {
          supabaseError: error.message,
        });
        return jsonError(
          {
            ...supabaseAuthErrorResponse(error, stage),
            error: error.message || "Email already registered",
            messageAr:
              "هذا البريد مسجل مسبقاً. يرجى تسجيل الدخول أو استخدام استعادة كلمة المرور.",
            action: "login",
          },
          409
        );
      }

      return jsonError(supabaseAuthErrorResponse(error, stage), error.status ?? 400);
    }

    if (!data.user) {
      logAuthFailure("signup", "supabase-no-user-returned", {
        email,
        supabaseSession: Boolean(data.session),
        ...getSupabaseAuthDiagnostics(),
      });
      return jsonError(
        {
          error: "Supabase signUp succeeded but returned no user object",
          code: "supabase_no_user",
          stage,
        },
        500
      );
    }

    if (isDuplicateSignupUser(data.user)) {
      logSignupConflict("supabase-empty-identities", await inspectSignupEmailConflict(email), {
        userId: data.user.id,
      });
      return jsonError(
        {
          error: "This email is already registered (empty identities response from Supabase)",
          code: "supabase_duplicate_user",
          stage,
          action: "login",
          messageAr: "هذا البريد مسجل مسبقاً. سجّل الدخول أو تحقق من بريدك لتأكيد الحساب.",
        },
        409
      );
    }

    stage = "profile-bootstrap";
    const authUser = buildAuthUserFromMetadata(data.user);
    authUser.fullName = body.fullName.trim();
    authUser.role = role;
    authUser.gender = gender ?? undefined;
    authUser.professionalUnlocked = role === "professional";
    authUser.hasFreelancerStore = role === "professional";
    authUser.hasProfessionalProfile = role !== "company";

    await bootstrapProfileAfterSignup({ authUser, email });

    stage = "anti-abuse";
    if (body.fingerprint) {
      const abuse = checkMultiAccount(body.fingerprint, authUser.id);
      if (abuse.flagged) {
        await supabase.auth.signOut();
        return jsonError({ error: abuse.message, stage }, 403);
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
        messageAr: "تحقق من بريدك الإلكتروني لتأكيد حسابك قبل تسجيل الدخول.",
      });
      clearLegacySessionCookie(response);
      return response;
    }

    stage = "resolve-session";
    let resolved = authUser;
    try {
      resolved = (await resolveAuthUser(data.user)) ?? authUser;
    } catch (resolveError) {
      logSignupUnhandledError(resolveError, stage, { email, userId: data.user.id });
    }

    const response = NextResponse.json({
      user: enrichAuthUser(resolved),
    });
    clearLegacySessionCookie(response);
    return response;
  } catch (error) {
    logSignupUnhandledError(error, stage);
    console.error("[auth/signup] catch block error object:", error);

    const message = error instanceof Error ? error.message : String(error);
    return jsonError(
      {
        error: message || "Unexpected signup failure",
        code: error instanceof Error ? error.name : "unexpected_signup_error",
        stage,
      },
      500
    );
  }
}
