import { NextResponse } from "next/server";
import { listApplicantsForJob } from "@/lib/company/applications-store";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAts(authResult.auth.user);
  if (denied) return denied;

  const { id: jobId } = await context.params;

  try {
    const applicants = await listApplicantsForJob(authResult.auth.user.id, jobId);
    return NextResponse.json({ applicants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load applicants";
    if (message === "Job not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
