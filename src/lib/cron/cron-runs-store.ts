import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";

const RUNS_FILE = "cron-runs.json";
const MAX_RUNS = 100;

export type CronJobId = "backup" | "search-reindex" | "subscription-reconcile";

export type CronRunStatus = "success" | "partial" | "failed" | "skipped";

export interface CronRunRecord {
  id: string;
  job: CronJobId;
  startedAt: string;
  finishedAt: string;
  status: CronRunStatus;
  durationMs: number;
  summary: Record<string, unknown>;
}

interface CronRunsFile {
  runs: CronRunRecord[];
}

function readRunsFile(): CronRunsFile {
  return readJsonStore(RUNS_FILE, () => ({ runs: [] }));
}

function writeRunsFile(data: CronRunsFile): void {
  writeJsonStore(RUNS_FILE, data);
}

export function recordCronRun(input: Omit<CronRunRecord, "id">): CronRunRecord {
  const data = readRunsFile();
  const record: CronRunRecord = {
    id: crypto.randomUUID(),
    ...input,
  };
  data.runs.unshift(record);
  if (data.runs.length > MAX_RUNS) {
    data.runs = data.runs.slice(0, MAX_RUNS);
  }
  writeRunsFile(data);
  return record;
}

export function getLastCronRun(job: CronJobId): CronRunRecord | null {
  return readRunsFile().runs.find((run) => run.job === job) ?? null;
}

export function listRecentCronRuns(limit = 20): CronRunRecord[] {
  return readRunsFile().runs.slice(0, limit);
}
