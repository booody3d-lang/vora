import { NextResponse } from "next/server";

import { listPublicJobSummaries } from "@/lib/jobs/listings";



export async function GET() {

  return NextResponse.json({ jobs: listPublicJobSummaries() });

}

