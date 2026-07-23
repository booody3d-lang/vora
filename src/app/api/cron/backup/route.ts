import { runBackupJob } from "@/lib/cron/backup-service";
import { validateCronAuth } from "@/lib/cron/cron-auth";
import { executeCronJob } from "@/lib/cron/execute-cron-job";

export async function GET(request: Request) {
  const denied = validateCronAuth(request);
  if (denied) return denied;

  return executeCronJob("backup", async () => {
    const result = await runBackupJob();
    const includedFiles = result.snapshot.files.filter((file) => file.included && !file.error).length;

    return {
      status: result.status,
      summary: {
        includedFiles,
        totalFiles: result.snapshot.files.length,
        supabasePersistence: result.snapshot.supabasePersistence,
        storage: result.storage,
        localManifestPath: result.localManifestPath,
        createdAt: result.snapshot.createdAt,
      },
    };
  });
}
