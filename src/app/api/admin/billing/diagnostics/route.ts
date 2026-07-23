import { NextResponse } from "next/server";
import { validateBillingPaymentConfig } from "@/lib/billing/stripe-config-validation";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const diagnostics = await validateBillingPaymentConfig();
  return NextResponse.json(diagnostics);
}
