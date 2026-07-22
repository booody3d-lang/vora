import { NextResponse } from "next/server";
import {
  getJobByIdForAccount,
  updateJobForAccount,
} from "@/lib/company/jobs-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { JobPosting } from "@/types/company";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const { id } = await context.params;
  const job = await getJobByIdForAccount(authResult.auth.user.id, id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const { id } = await context.params;

  let body: Partial<JobPosting>;
  try {
    body = (await request.json()) as Partial<JobPosting>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed: Partial<JobPosting> = {};
  if (body.title !== undefined) allowed.title = body.title;
  if (body.description !== undefined) allowed.description = body.description;
  if (body.location !== undefined) allowed.location = body.location;
  if (body.workLocation !== undefined) allowed.workLocation = body.workLocation;
  if (body.employmentType !== undefined) allowed.employmentType = body.employmentType;
  if (body.salaryMin !== undefined) allowed.salaryMin = body.salaryMin;
  if (body.salaryMax !== undefined) allowed.salaryMax = body.salaryMax;
  if (body.showSalary !== undefined) allowed.showSalary = body.showSalary;
  if (body.requiredSkills !== undefined) allowed.requiredSkills = body.requiredSkills;
  if (body.requireVideoPitch !== undefined) allowed.requireVideoPitch = body.requireVideoPitch;
  if (
    body.status === "draft" ||
    body.status === "active" ||
    body.status === "closed" ||
    body.status === "archived"
  ) {
    allowed.status = body.status;
  }

  const job = await updateJobForAccount(authResult.auth.user.id, id, allowed);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
