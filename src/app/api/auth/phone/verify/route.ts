import { NextRequest, NextResponse } from "next/server";
import { linkPhoneToAuthenticatedUser } from "@/lib/auth/phone-auth-supabase";
import { findAccountByPhoneFromDb } from "@/lib/auth/supabase-account";
import { verifyOtpDelivery } from "@/lib/auth/otp-store";
import { normalizePhoneFromRequest } from "@/lib/auth/phone/detect-country";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/lib/security/session";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/security/rate-limit";
import { getRequestAuditContext, maskPhone, writeSecurityAuditEvent } from "@/lib/security/audit-store";
import type { OtpDeliveryChannel } from "@/types/auth-phone";

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
    const body = (await request.json()) as {
      phone?: string;
      countryCode?: string;
      code?: string;
      channel?: string;
    };

    if (!body.phone?.trim() || body.code?.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`phone-link:${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many phone link attempts." },
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

    const otpResult = await verifyOtpDelivery({
      phone: normalized.e164,
      code: body.code,
      purpose: "2fa",
    });

    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    const channel =
      body.channel === "whatsapp" || body.channel === "sms"
        ? (body.channel as OtpDeliveryChannel)
        : undefined;

    const linkResult = await linkPhoneToAuthenticatedUser({
      authUser: auth.user,
      phoneE164: normalized.e164,
      phoneCountry: normalized.countryIso2,
      preferredChannel: channel,
    });

    if (!linkResult.ok) {
      return NextResponse.json({ error: linkResult.error }, { status: linkResult.status });
    }

    const { userAgent } = getRequestAuditContext(request);
    await writeSecurityAuditEvent({
      accountId: auth.user.id,
      action: "security.phone.linked",
      ip,
      userAgent,
      metadata: {
        phone: maskPhone(normalized.e164),
        channel: channel ?? "sms",
      },
    });

    return NextResponse.json({
      ok: true,
      linked: true,
      phone: normalized.e164,
      user: linkResult.authUser,
    });
  } catch {
    return NextResponse.json({ error: "Failed to link phone number" }, { status: 500 });
  }
}
