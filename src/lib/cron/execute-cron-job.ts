import "server-only";

import { NextResponse } from "next/server";
import {
  recordCronRun,
  type CronJobId,
  type CronRunStatus,
} from "@/lib/cron/cron-runs-store";
import { writeSecurityAuditEvent } from "@/lib/security/audit-store";

export async function executeCronJob(
  job: CronJobId,
  handler: () => Promise<{ status: CronRunStatus; summary: Record<string, unknown> }>
): Promise<NextResponse> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  try {
    const result = await handler();
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;

    recordCronRun({
      job,
      startedAt,
      finishedAt,
      status: result.status,
      durationMs,
      summary: result.summary,
    });

    await writeSecurityAuditEvent({
      accountId: null,
      action: `cron.${job}.${result.status}`,
      severity: result.status === "failed" ? "warn" : "info",
      metadata: {
        job,
        durationMs,
        ...result.summary,
      },
    });

    return NextResponse.json({
      ok: result.status !== "failed",
      job,
      status: result.status,
      durationMs,
      ...result.summary,
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;
    const message = error instanceof Error ? error.message : "cron_job_failed";

    recordCronRun({
      job,
      startedAt,
      finishedAt,
      status: "failed",
      durationMs,
      summary: { error: message },
    });

    await writeSecurityAuditEvent({
      accountId: null,
      action: `cron.${job}.failed`,
      severity: "warn",
      metadata: { job, durationMs, error: message },
    });

    console.error(`[VORA Cron] ${job} failed:`, error);

    return NextResponse.json(
      { ok: false, job, status: "failed", durationMs, error: message },
      { status: 500 }
    );
  }
}
