import "server-only";

import {
  activateCompanySubscriptionForAccount,
  expireCompanySubscriptionForAccount,
} from "@/lib/company/company-store";

export function isCompanyBillingPlan(plan?: string, tierId?: string): boolean {
  return plan === "company_annual" || tierId === "company-standard";
}

/** Sync company_subscriptions when Stripe billing events affect company plans */
export async function syncCompanySubscriptionFromStripe(input: {
  accountId: string;
  plan?: string;
  tierId?: string;
  action: "activate" | "expire";
  expiresAt?: string;
}): Promise<void> {
  if (!isCompanyBillingPlan(input.plan, input.tierId)) return;

  if (input.action === "expire") {
    await expireCompanySubscriptionForAccount(input.accountId);
    return;
  }

  if (input.expiresAt) {
    await activateCompanySubscriptionForAccount(input.accountId, input.expiresAt);
  }
}
