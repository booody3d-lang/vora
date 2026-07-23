import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureSubscriptionCacheHydrated,
  getSubscriptionSnapshotStats,
  isSubscriptionSupabaseReady,
} from "@/lib/subscription/subscription-store";
import type { CronRunStatus } from "@/lib/cron/cron-runs-store";

export interface SubscriptionReconcileResult {
  status: CronRunStatus;
  checkedAt: string;
  stats: ReturnType<typeof getSubscriptionSnapshotStats>;
  supabaseCompared: boolean;
  issues: string[];
}

/** Lightweight, read-only subscription consistency check — no mutations. */
export async function reconcileSubscriptions(): Promise<SubscriptionReconcileResult> {
  await ensureSubscriptionCacheHydrated();
  const stats = getSubscriptionSnapshotStats();
  const issues: string[] = [];
  let supabaseCompared = false;

  if (stats.expiredActive.length > 0) {
    issues.push(
      `${stats.expiredActive.length} active assignment(s) past expiresAt (sample: ${stats.expiredActive.slice(0, 3).join(", ")})`
    );
  }

  if (stats.stripeCustomersWithoutAssignment.length > 0) {
    issues.push(
      `${stats.stripeCustomersWithoutAssignment.length} Stripe customer mapping(s) without assignment`
    );
  }

  if (await isSubscriptionSupabaseReady()) {
    supabaseCompared = true;
    try {
      const admin = createAdminClient();
      const { count, error } = await admin
        .from("account_subscription_assignments")
        .select("*", { count: "exact", head: true });

      if (error) {
        issues.push(`Supabase assignment count unavailable: ${error.message}`);
      } else if (typeof count === "number" && count !== stats.assignmentCount) {
        issues.push(
          `Assignment count mismatch — JSON=${stats.assignmentCount}, Supabase=${count}`
        );
      }
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "Supabase reconcile probe failed"
      );
    }
  }

  const status: CronRunStatus =
    issues.length === 0 ? "success" : issues.length <= 2 ? "partial" : "failed";

  return {
    status,
    checkedAt: new Date().toISOString(),
    stats,
    supabaseCompared,
    issues,
  };
}
