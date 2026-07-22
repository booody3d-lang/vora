import { NextResponse } from "next/server";
import { getEmailProviderLabel, resolveActiveEmailProvider } from "@/lib/email/email-provider";
import {
  resolveResendApiKey,
  resolveResendFromEmail,
  resolveOwnerNotificationEmail,
} from "@/lib/email/config";
import { getAuthenticatedUser } from "@/lib/security/session";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const provider = resolveActiveEmailProvider();
  return NextResponse.json({
    provider,
    providerLabel: getEmailProviderLabel(provider),
    resendConfigured: Boolean(resolveResendApiKey()),
    fromEmail: resolveResendFromEmail(),
    ownerEmail: resolveOwnerNotificationEmail(),
  });
}
