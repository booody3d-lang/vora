import { NextResponse } from "next/server";
import {
  getAdminAnalyticsSnapshot,
  isAdminAnalyticsPersistenceActive,
  type AdminAnalyticsTimeline,
} from "@/lib/admin/admin-analytics-store";
import { requireAdminApiUser } from "@/lib/security/require-api-auth";

function parseTimeline(value: string | null): AdminAnalyticsTimeline {
  if (value === "90d" || value === "120d") return value;
  return "30d";
}

export async function GET(request: Request) {
  const authResult = await requireAdminApiUser();
  if ("response" in authResult) return authResult.response;

  const { searchParams } = new URL(request.url);
  const timeline = parseTimeline(searchParams.get("timeline"));
  const snapshot = await getAdminAnalyticsSnapshot(timeline);

  return NextResponse.json({
    ...snapshot,
    persistence: isAdminAnalyticsPersistenceActive() ? "supabase" : "demo",
  });
}
