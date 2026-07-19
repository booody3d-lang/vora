import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";
import { resolveAdminCapabilities } from "@/lib/security/roles";
import { getRecoveryChannel } from "@/lib/security/auth-store";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false, user: null, isAuthenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    isAuthenticated: true,
    user: auth.user,
    role: auth.session.role,
    capabilities: resolveAdminCapabilities(auth.user),
    security: {
      password: {
        change: {
          method: "PATCH",
          url: "/api/profile/me",
          action: "changePassword",
        },
        forgot: {
          method: "POST",
          url: "/api/auth/password/forgot",
        },
        reset: {
          method: "POST",
          url: "/api/auth/password/reset",
        },
      },
      recoveryChannel: getRecoveryChannel(auth.user.id),
    },
  });
}
