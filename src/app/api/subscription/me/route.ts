import { NextResponse } from "next/server";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  const effective = getEffectiveSubscription(auth.user.id, "user");
  return NextResponse.json({
    authenticated: true,
    effective,
  });
}
