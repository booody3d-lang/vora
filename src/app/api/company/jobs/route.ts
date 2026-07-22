import { NextResponse } from "next/server";
import { forbidCompanyJobPublish } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  return NextResponse.json({
    jobs: [],
    note: "Job listing from Supabase lands in Phase 5C",
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyJobPublish(authResult.auth.user);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { title?: string };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  return NextResponse.json(
    {
      error: "Job publishing API is not yet implemented",
      phase: "5C",
      publishAllowed: true,
    },
    { status: 501 }
  );
}
