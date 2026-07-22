import { NextResponse } from "next/server";
import { getCompanyByAccountId } from "@/lib/company/company-store";
import { createJobForAccount, listJobsForAccount } from "@/lib/company/jobs-store";
import { forbidCompanyJobPublish } from "@/lib/security/feature-guard";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { JobPostingForm } from "@/types/company";

function parseJobPostingForm(body: unknown): JobPostingForm | null {
  if (!body || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (!title || !location || !description) return null;

  const workLocation = input.workLocation;
  const employmentType = input.employmentType;

  return {
    title,
    location,
    description,
    workLocation:
      workLocation === "onsite" || workLocation === "hybrid" || workLocation === "remote"
        ? workLocation
        : "hybrid",
    employmentType:
      employmentType === "full_time" ||
      employmentType === "part_time" ||
      employmentType === "contract"
        ? employmentType
        : "full_time",
    salaryMin: typeof input.salaryMin === "number" ? input.salaryMin : undefined,
    salaryMax: typeof input.salaryMax === "number" ? input.salaryMax : undefined,
    showSalary: Boolean(input.showSalary),
    requiredSkills: Array.isArray(input.requiredSkills)
      ? input.requiredSkills.filter((skill): skill is string => typeof skill === "string")
      : [],
    requireVideoPitch: Boolean(input.requireVideoPitch),
  };
}

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const company = await getCompanyByAccountId(authResult.auth.user.id);
  if (!company) {
    return NextResponse.json({ error: "Company profile required" }, { status: 404 });
  }

  const jobs = await listJobsForAccount(authResult.auth.user.id);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const denied = await forbidCompanyJobPublish(authResult.auth.user);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const form = parseJobPostingForm(body);
  if (!form) {
    return NextResponse.json(
      { error: "Job title, location, and description are required" },
      { status: 400 }
    );
  }

  try {
    const job = await createJobForAccount(authResult.auth.user.id, form, "active");
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
