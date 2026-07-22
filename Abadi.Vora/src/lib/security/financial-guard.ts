import { NextResponse } from "next/server";
import type { AuthUser } from "@/types/security";
import { canAccessFinancialData } from "@/lib/security/roles";

export function forbidFinancialAccess(
  user: Pick<AuthUser, "email" | "role"> | null | undefined
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessFinancialData(user)) {
    return NextResponse.json(
      { error: "Forbidden — financial and Stripe operations are owner-only" },
      { status: 403 }
    );
  }
  return null;
}
