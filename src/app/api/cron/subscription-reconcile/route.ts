import { validateCronAuth } from "@/lib/cron/cron-auth";
import { executeCronJob } from "@/lib/cron/execute-cron-job";
import { reconcileSubscriptions } from "@/lib/cron/subscription-reconcile";

export async function GET(request: Request) {
  const denied = validateCronAuth(request);
  if (denied) return denied;

  return executeCronJob("subscription-reconcile", async () => {
    const result = await reconcileSubscriptions();
    return {
      status: result.status,
      summary: {
        checkedAt: result.checkedAt,
        supabaseCompared: result.supabaseCompared,
        issueCount: result.issues.length,
        issues: result.issues,
        stats: result.stats,
      },
    };
  });
}
