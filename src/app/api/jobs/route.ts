import { NextResponse } from "next/server";

import { listPublicJobSummaries } from "@/lib/jobs/listings";

export async function GET() {
  const jobs = await listPublicJobSummaries();
  return NextResponse.json({ jobs });
}
