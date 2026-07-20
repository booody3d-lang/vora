import { NextResponse } from "next/server";
import { getSupabaseAuthDiagnostics } from "@/lib/auth/auth-diagnostics";

export async function GET() {
  const diagnostics = getSupabaseAuthDiagnostics();

  return NextResponse.json({
    authProvider: "supabase",
    supabaseConfigured: diagnostics.supabaseConfigured,
    supabaseProject: diagnostics.supabaseProject,
    requirePassword: true,
  });
}
