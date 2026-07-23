import { NextResponse } from "next/server";
import { upsertAccountRow } from "@/lib/auth/supabase-account";
import {
  clearTotpForAccount,
  disableTotpForAccount,
  enableTotpForAccount,
  getTotpAccountState,
  saveTotpSetup,
} from "@/lib/auth/totp-store";
import { generateTotpSecret } from "@/lib/security/otp";
import { getAuthenticatedUser } from "@/lib/security/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    const { findAccountById } = await import("@/lib/security/demo-store");
    const { generateTotpSecret: genSecret } = await import("@/lib/security/otp");
    const account = findAccountById(auth.user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const { secret, uri } = genSecret(account.email);
    account.totpSecret = secret;
    return NextResponse.json({
      uri,
      message: "Scan with Google Authenticator or any TOTP app",
    });
  }

  const state = await getTotpAccountState(auth.user.id);
  if (state.totpEnabled) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 });
  }

  const { secret, uri } = generateTotpSecret(auth.user.email);
  await saveTotpSetup(auth.user.id, secret);

  return NextResponse.json({
    uri,
    message: "Scan with Google Authenticator or any TOTP app",
  });
}

export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    enable?: boolean;
    password?: string;
  };

  if (!body.code?.trim() && !body.password) {
    return NextResponse.json({ error: "Verification code or password is required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const { findAccountById } = await import("@/lib/security/demo-store");
    const { verifyTotpCode } = await import("@/lib/security/otp");
    const account = findAccountById(auth.user.id);
    if (!account?.totpSecret) {
      return NextResponse.json({ error: "Run setup first" }, { status: 400 });
    }
    if (!body.code || !verifyTotpCode(account.totpSecret, body.code)) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }
    account.totpEnabled = body.enable !== false;
    return NextResponse.json({ totpEnabled: account.totpEnabled });
  }

  const enable = body.enable !== false;

  if (enable) {
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const state = await getTotpAccountState(auth.user.id);
    if (state.totpEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 });
    }
    if (!state.hasSecret) {
      return NextResponse.json({ error: "Run setup first" }, { status: 400 });
    }

    const ok = await enableTotpForAccount(auth.user.id, body.code.trim());
    if (!ok) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }

    await upsertAccountRow({ ...auth.user, totpEnabled: true });
    return NextResponse.json({ totpEnabled: true });
  }

  let authorized = false;
  if (body.code?.trim()) {
    authorized = await disableTotpForAccount(auth.user.id, body.code.trim());
  } else if (body.password) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: auth.user.email,
      password: body.password,
    });
    authorized = !error;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Invalid verification code or password" }, { status: 401 });
  }

  if (body.password && !body.code?.trim()) {
    await clearTotpForAccount(auth.user.id);
  }

  await upsertAccountRow({ ...auth.user, totpEnabled: false });
  return NextResponse.json({ totpEnabled: false });
}
