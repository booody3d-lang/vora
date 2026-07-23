import { NextRequest, NextResponse } from "next/server";
import { findAccountByPhoneFromDb } from "@/lib/auth/supabase-account";
import { normalizePhoneFromRequest } from "@/lib/auth/phone/detect-country";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/lib/security/session";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";

/** Pre-check before sending OTP to link a phone number to the current account. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Phone linking requires Supabase authentication" },
      { status: 503 }
    );
  }

  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { phone?: string; countryCode?: string };
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`phone-link-check:${ip}`, RATE_LIMITS.standard);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const normalized = normalizePhoneFromRequest(body.phone, request, body.countryCode);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const taken = await findAccountByPhoneFromDb(normalized.e164);
    if (taken && taken.id !== auth.user.id) {
      return NextResponse.json(
        { error: "Phone number is already linked to another account" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      phone: normalized.e164,
      countryIso2: normalized.countryIso2,
      nextStep: "Send OTP via POST /api/auth/otp/send with purpose=2fa, then confirm via POST /api/auth/phone/verify",
    });
  } catch {
    return NextResponse.json({ error: "Failed to validate phone number" }, { status: 500 });
  }
}
