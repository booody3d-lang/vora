import { NextResponse } from "next/server";
import { addInternalNote, listInternalNotes } from "@/lib/company/applications-store";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

interface RouteContext {
  params: Promise<{ id: string; applicationId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAts(authResult.auth.user);
  if (denied) return denied;

  const { id: jobId, applicationId } = await context.params;

  try {
    const notes = await listInternalNotes(
      authResult.auth.user.id,
      jobId,
      applicationId
    );
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notes";
    if (message === "Job not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAts(authResult.auth.user);
  if (denied) return denied;

  const { id: jobId, applicationId } = await context.params;

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Note content is required" }, { status: 400 });
  }

  try {
    const note = await addInternalNote(
      authResult.auth.user.id,
      jobId,
      applicationId,
      content,
      authResult.auth.user.fullName ?? "HR Team"
    );
    if (!note) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add note";
    if (message === "Job not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
