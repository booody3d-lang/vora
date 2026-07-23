import { NextResponse } from "next/server";
import { buildHealthReport, resolveHealthHttpStatus } from "@/lib/monitoring/health";

export const runtime = "nodejs";

/** Public readiness/liveness probe — no auth, no secrets. */
export async function GET() {
  const report = await buildHealthReport();
  return NextResponse.json(report, { status: resolveHealthHttpStatus(report) });
}
