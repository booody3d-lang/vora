import { NextResponse } from "next/server";
import {
  getCompanyByAccountId,
  getCompanySlugForAccount,
} from "@/lib/company/company-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  const company = getCompanyByAccountId(auth.user.id);
  const companySlug = getCompanySlugForAccount(auth.user.id);

  if (!company || !companySlug) {
    return NextResponse.json({
      authenticated: true,
      hasCompany: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    hasCompany: true,
    companySlug,
    company,
  });
}
