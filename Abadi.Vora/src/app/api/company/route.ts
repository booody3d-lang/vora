import { NextResponse } from "next/server";
import {
  getCompanyByAccountId,
  updateCompanyForAccount,
} from "@/lib/company/company-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { CompanyProfile } from "@/types/company";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.user.role !== "company" && auth.user.role !== "admin" && auth.user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = getCompanyByAccountId(auth.user.id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.user.role !== "company" && auth.user.role !== "admin" && auth.user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<CompanyProfile>;
    const company = updateCompanyForAccount(auth.user.id, body);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
