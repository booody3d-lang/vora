import "server-only";

import { isCronSecretConfigured } from "@/lib/cron/cron-auth";
import { getLastCronRun, listRecentCronRuns, type CronJobId } from "@/lib/cron/cron-runs-store";

export interface CronScheduleEntry {
  job: CronJobId;
  path: string;
  schedule: string;
  description: string;
}

export interface CronDiagnostics {
  schedules: CronScheduleEntry[];
  env: {
    cronSecret: { configured: boolean };
    backupStorage: { configured: boolean; target?: string };
    dataDir: string;
  };
  lastRuns: Partial<
    Record<
      CronJobId,
      {
        status: string;
        startedAt: string;
        finishedAt: string;
        durationMs: number;
        summary: Record<string, unknown>;
      }
    >
  >;
  recentRuns: ReturnType<typeof listRecentCronRuns>;
  readiness: {
    cronAuth: { ready: boolean; reasons: string[] };
    backup: { ready: boolean; reasons: string[] };
  };
  warnings: string[];
}

const SCHEDULES: CronScheduleEntry[] = [
  {
    job: "backup",
    path: "/api/cron/backup",
    schedule: "0 3 * * *",
    description: "Daily JSON store manifest export (03:00 UTC)",
  },
  {
    job: "search-reindex",
    path: "/api/cron/search-reindex",
    schedule: "0 */6 * * *",
    description: "Rebuild file-based search index every 6 hours",
  },
  {
    job: "subscription-reconcile",
    path: "/api/cron/subscription-reconcile",
    schedule: "0 4 * * *",
    description: "Daily subscription dual-write consistency check (04:00 UTC)",
  },
];

function redactStorageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.startsWith("s3://") ? "s3://…" : "configured";
  }
}

/** Owner-only cron infrastructure diagnostics — never exposes CRON_SECRET. */
export function validateCronDiagnostics(): CronDiagnostics {
  const cronSecretConfigured = isCronSecretConfigured();
  const backupUrl = process.env.BACKUP_STORAGE_URL?.trim();
  const warnings: string[] = [];

  if (!cronSecretConfigured) {
    warnings.push("CRON_SECRET is not set — Vercel cron routes will return 503");
  }

  if (!backupUrl) {
    warnings.push("BACKUP_STORAGE_URL is unset — backups save local manifests only");
  } else if (backupUrl.startsWith("s3://")) {
    warnings.push(
      "BACKUP_STORAGE_URL uses s3:// — configure a presigned HTTPS endpoint for serverless uploads"
    );
  }

  const lastRuns: CronDiagnostics["lastRuns"] = {};
  for (const schedule of SCHEDULES) {
    const last = getLastCronRun(schedule.job);
    if (last) {
      lastRuns[schedule.job] = {
        status: last.status,
        startedAt: last.startedAt,
        finishedAt: last.finishedAt,
        durationMs: last.durationMs,
        summary: last.summary,
      };
    }
  }

  const cronAuthReasons: string[] = [];
  if (!cronSecretConfigured) {
    cronAuthReasons.push("Set CRON_SECRET in Vercel project environment variables");
  }

  const backupReasons: string[] = [];
  if (!backupUrl) {
    backupReasons.push("Optional: set BACKUP_STORAGE_URL to an HTTPS upload endpoint");
  }

  return {
    schedules: SCHEDULES,
    env: {
      cronSecret: { configured: cronSecretConfigured },
      backupStorage: {
        configured: Boolean(backupUrl),
        target: backupUrl ? redactStorageUrl(backupUrl) : undefined,
      },
      dataDir: process.env.VORA_DATA_DIR?.trim() || "(default: .data/vora or /tmp/vora on Vercel)",
    },
    lastRuns,
    recentRuns: listRecentCronRuns(10),
    readiness: {
      cronAuth: { ready: cronSecretConfigured, reasons: cronAuthReasons },
      backup: { ready: cronSecretConfigured, reasons: backupReasons },
    },
    warnings,
  };
}
