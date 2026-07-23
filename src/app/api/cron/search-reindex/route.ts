import { validateCronAuth } from "@/lib/cron/cron-auth";
import { executeCronJob } from "@/lib/cron/execute-cron-job";
import { rebuildSearchIndex } from "@/lib/search/search-index";

export async function GET(request: Request) {
  const denied = validateCronAuth(request);
  if (denied) return denied;

  return executeCronJob("search-reindex", async () => {
    const index = await rebuildSearchIndex();
    return {
      status: "success" as const,
      summary: {
        count: index.entries.length,
        builtAt: index.builtAt,
      },
    };
  });
}
