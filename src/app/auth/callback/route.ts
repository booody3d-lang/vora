import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=missing_auth_code`);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=supabase_not_configured`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth_callback_failed`);
  }

  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}
