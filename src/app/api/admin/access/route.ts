import { NextResponse } from "next/server";
import {
  canAccessFinancialData,
  canConfigureStripe,
  canManageSubscriptionBadges,
  canMonitorSiteActivity,
  isPlatformOwner,
  resolveAdminCapabilities,
} from "@/lib/security/roles";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const capabilities = resolveAdminCapabilities(auth.user);

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      role: auth.user.role,
    },
    capabilities,
    isOwner: isPlatformOwner(auth.user),
    canViewFinance: canAccessFinancialData(auth.user),
    canManageSubscriptions: canManageSubscriptionBadges(auth.user),
    canConfigureStripe: canConfigureStripe(auth.user),
    canMonitorActivity: canMonitorSiteActivity(auth.user),
  });
}
