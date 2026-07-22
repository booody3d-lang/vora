import { NextResponse } from "next/server";
import {
  createCompanyForAccount,
  getCompanyByAccountId,
  getCompanySubscriptionForAccount,
  updateCompanyForAccount,
} from "@/lib/company/company-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { CompanyProfile } from "@/types/company";

function isCompanyRole(role: string) {
  return role === "company" || role === "admin" || role === "owner";
}

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCompanyRole(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getCompanyByAccountId(auth.user.id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const subscription = await getCompanySubscriptionForAccount(auth.user.id);

  return NextResponse.json({ company, subscription });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.user.role !== "company") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getCompanyByAccountId(auth.user.id);
  if (existing) {
    return NextResponse.json({ error: "Company already registered" }, { status: 409 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      industry?: string;
      sizeRange?: string;
      headquarters?: string;
      websiteUrl?: string;
      tagline?: string;
      about?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const { company, subscription } = await createCompanyForAccount(auth.user.id, {
      name,
      industry: body.industry?.trim(),
      sizeRange: body.sizeRange?.trim(),
      headquarters: body.headquarters?.trim(),
      websiteUrl: body.websiteUrl?.trim(),
      tagline: body.tagline?.trim(),
      about: body.about?.trim(),
    });

    return NextResponse.json({ company, subscription }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("[company POST]", message);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCompanyRole(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<CompanyProfile>;
    const company = await updateCompanyForAccount(auth.user.id, body);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
