import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/security/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const UNAVAILABLE_MESSAGE =
  "Two-factor authentication is being migrated to Supabase Auth and is temporarily unavailable.";

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const { findAccountById } = await import("@/lib/security/demo-store");
  const { generateTotpSecret } = await import("@/lib/security/otp");

  const account = findAccountById(session.sub);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { secret, uri } = generateTotpSecret(account.email);
  account.totpSecret = secret;

  return NextResponse.json({
    secret,
    uri,
    message: "Scan with Google Authenticator or any TOTP app",
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const body = await request.json() as { code: string; enable: boolean };
  const { findAccountById } = await import("@/lib/security/demo-store");
  const account = findAccountById(session.sub);
  if (!account?.totpSecret) {
    return NextResponse.json({ error: "Run setup first" }, { status: 400 });
  }

  const { verifyTotpCode } = await import("@/lib/security/otp");
  if (!verifyTotpCode(account.totpSecret, body.code)) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  account.totpEnabled = body.enable;
  return NextResponse.json({ totpEnabled: account.totpEnabled });
}
