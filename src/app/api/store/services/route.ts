import { NextResponse } from "next/server";
import {
  isServicesPersistenceActive,
  listServicesForAccount,
  saveServicesForAccount,
} from "@/lib/freelance/services-store";
import { ensureFreelancerStoreForAccount } from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";
import type { MarketplaceService } from "@/types/freelance";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  ensureFreelancerStoreForAccount(auth.user.id);

  const services = await listServicesForAccount(auth.user.id);
  return NextResponse.json({
    services,
    persistence: isServicesPersistenceActive() ? "supabase" : "json",
  });
}

export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseProfileAndStore(auth.user);
    ensureFreelancerStoreForAccount(auth.user.id);

    const body = (await request.json()) as { services: MarketplaceService[] };
    const services = await saveServicesForAccount(auth.user.id, body.services ?? []);
    if (!services) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({
      services,
      persistence: isServicesPersistenceActive() ? "supabase" : "json",
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
