import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user: auth.user, role: auth.session.role });
}
