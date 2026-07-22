import { NextResponse } from "next/server";
import {
  getSellerAnalyticsForAccount,
  isAnalyticsPersistenceActive,
} from "@/lib/freelance/analytics-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const { analytics, source } = await getSellerAnalyticsForAccount(auth.user.id);

  return NextResponse.json({
    analytics,
    source,
    persistence: isAnalyticsPersistenceActive() ? "supabase" : "json",
  });
}
