import { NextResponse } from "next/server";
import {
  getCompanyByAccountId,
  getCompanySlugForAccount,
  getCompanySubscriptionForAccount,
} from "@/lib/company/company-store";
import { getCompanySocialContext } from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { getCompanyPublishState } from "@/lib/security/feature-guard";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  const company = await getCompanyByAccountId(auth.user.id);
  const companySlug = getCompanySlugForAccount(auth.user.id) ?? company?.slug ?? null;

  if (!company || !companySlug) {
    return NextResponse.json({
      authenticated: true,
      hasCompany: false,
    });
  }

  const subscription = await getCompanySubscriptionForAccount(auth.user.id);
  const publishGuard = await getCompanyPublishState(auth.user.id);
  const social = await getCompanySocialContext(auth.user.id, company.id);

  return NextResponse.json({
    authenticated: true,
    hasCompany: true,
    companySlug,
    company: {
      ...company,
      followerCount: social.followerCount,
    },
    subscription,
    publishGuard: {
      allowed: publishGuard.allowed,
      reason: publishGuard.reason,
      source: publishGuard.source,
      state: publishGuard.state,
    },
  });
}
