import "server-only";

import { resolveOwnerNotificationEmail, isValidEmailAddress } from "@/lib/email/config";
import { findAccountById } from "@/lib/security/demo-store";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { NotificationPayload } from "@/types/notifications";

export function resolveOwnerEmail(): string {
  return resolveOwnerNotificationEmail();
}

export async function resolveAccountEmail(accountId: string): Promise<string | null> {
  if (isAdminClientAvailable()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("accounts")
        .select("email")
        .eq("id", accountId)
        .maybeSingle();

      if (!error && data?.email && isValidEmailAddress(data.email)) {
        return data.email.trim();
      }
    } catch {
      // fall through to demo store
    }
  }

  const demoAccount = findAccountById(accountId);
  if (demoAccount?.email && isValidEmailAddress(demoAccount.email)) {
    return demoAccount.email;
  }

  return null;
}

export function resolveNotificationRecipient(input: {
  notification: NotificationPayload;
  ownerEmail?: boolean;
  recipientEmail?: string;
  accountId?: string;
}): { to: string | null; reason?: string } {
  if (input.ownerEmail) {
    const owner = resolveOwnerEmail();
    return isValidEmailAddress(owner) ? { to: owner } : { to: null, reason: "invalid-owner-email" };
  }

  if (input.recipientEmail && isValidEmailAddress(input.recipientEmail)) {
    return { to: input.recipientEmail.trim() };
  }

  return { to: null, reason: "missing-recipient" };
}

export async function resolveNotificationRecipientAsync(input: {
  notification: NotificationPayload;
  ownerEmail?: boolean;
  recipientEmail?: string;
  accountId?: string;
}): Promise<{ to: string | null; reason?: string }> {
  const direct = resolveNotificationRecipient(input);
  if (direct.to) return direct;

  if (input.accountId) {
    const email = await resolveAccountEmail(input.accountId);
    if (email) return { to: email };
  }

  return direct;
}
