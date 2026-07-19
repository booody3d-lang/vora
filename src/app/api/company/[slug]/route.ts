import { NextResponse } from "next/server";
import { getCompanyBySlug } from "@/lib/company/company-store";
import { listCurrentEmployeesForCompany } from "@/lib/company/employees";
import { getCompanySocialContext } from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await getAuthenticatedUser();
  const social = getCompanySocialContext(auth?.user.id ?? null, company.id);

  const responseCompany = {
    ...company,
    followerCount: social.followerCount,
    isFollowing: social.isFollowing,
    isAccepted: social.isAccepted,
  };

  if (auth) {
    responseCompany.currentEmployees = listCurrentEmployeesForCompany(company.id);
  }

  return NextResponse.json({ company: responseCompany, social });
}
