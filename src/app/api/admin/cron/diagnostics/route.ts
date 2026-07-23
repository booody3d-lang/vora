import { NextResponse } from "next/server";
import { validateCronDiagnostics } from "@/lib/cron/cron-diagnostics";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  return NextResponse.json(validateCronDiagnostics());
}
