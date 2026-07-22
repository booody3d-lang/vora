import { NextResponse } from "next/server";
import {
  getApplicantForJob,
  updateApplicantRating,
  updateApplicantStage,
} from "@/lib/company/applications-store";
import { forbidCompanyAts } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { AtsStage } from "@/types/company";

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
    const applicant = await getApplicantForJob(
      authResult.auth.user.id,
      jobId,
      applicationId
    );
    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }
    return NextResponse.json({ applicant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load applicant";
    if (message === "Job not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyAts(authResult.auth.user);
  if (denied) return denied;

  const { id: jobId, applicationId } = await context.params;

  let body: { stage?: AtsStage; sortOrder?: number; hrRating?: number };
  try {
    body = (await request.json()) as { stage?: AtsStage; sortOrder?: number; hrRating?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.stage !== undefined) {
      const allowedStages: AtsStage[] = [
        "new_applications",
        "under_review",
        "interview_scheduled",
        "final_review",
        "hired",
        "rejected",
      ];
      if (!allowedStages.includes(body.stage)) {
        return NextResponse.json({ error: "Invalid ATS stage" }, { status: 400 });
      }

      const applicant = await updateApplicantStage(
        authResult.auth.user.id,
        jobId,
        applicationId,
        body.stage,
        body.sortOrder ?? 0
      );
      if (!applicant) {
        return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
      }
      return NextResponse.json({ applicant });
    }

    if (body.hrRating !== undefined) {
      if (!Number.isInteger(body.hrRating) || body.hrRating < 1 || body.hrRating > 5) {
        return NextResponse.json({ error: "hrRating must be an integer from 1 to 5" }, { status: 400 });
      }

      const applicant = await updateApplicantRating(
        authResult.auth.user.id,
        jobId,
        applicationId,
        body.hrRating
      );
      if (!applicant) {
        return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
      }
      return NextResponse.json({ applicant });
    }

    return NextResponse.json({ error: "No supported fields to update" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update applicant";
    if (message === "Job not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
