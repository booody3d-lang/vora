import { NextResponse } from "next/server";
import { getAdminFinanceSnapshot } from "@/lib/admin/admin-finance-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const snapshot = await getAdminFinanceSnapshot();
  return NextResponse.json(snapshot);
}
