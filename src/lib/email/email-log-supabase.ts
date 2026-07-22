import "server-only";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import type { EmailDeliveryLogEntry } from "@/lib/email/types";

let emailLogTableProbed = false;
let emailLogTableAvailable = false;

async function isEmailLogSupabaseReady(): Promise<boolean> {
  if (!isAdminClientAvailable()) return false;
  if (emailLogTableProbed) return emailLogTableAvailable;

  emailLogTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("email_delivery_log").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("email_delivery_log missing", error);
      }
      emailLogTableAvailable = false;
      return false;
    }
    emailLogTableAvailable = true;
    return true;
  } catch {
    emailLogTableAvailable = false;
    return false;
  }
}

function mapLogRow(entry: EmailDeliveryLogEntry): Record<string, unknown> {
  return {
    id: entry.id,
    to_email: entry.toEmail,
    subject: entry.subject,
    trigger_type: entry.trigger ?? null,
    provider: entry.provider,
    status: entry.status,
    message_id: entry.messageId ?? null,
    error_message: entry.errorMessage ?? null,
    payload_summary: entry.payloadSummary ?? null,
    created_at: entry.createdAt,
  };
}

export async function persistEmailDeliveryLog(entry: EmailDeliveryLogEntry): Promise<void> {
  if (!(await isEmailLogSupabaseReady())) return;

  await runOptionalDbSyncVoid("persistEmailDeliveryLog", async () => {
    const admin = createAdminClient();
    const { error } = await admin.from("email_delivery_log").upsert(mapLogRow(entry), {
      onConflict: "id",
    });
    if (error) throw error;
  });
}
