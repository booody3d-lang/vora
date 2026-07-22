import { NextResponse } from "next/server";
import {
  getStoreForAccount,
  isStorePersistenceActive,
  listPortfolioForStoreSlug,
  savePortfolioForAccount,
} from "@/lib/freelance/store-store";
import { ensureFreelancerStoreForAccount } from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";
import type { PortfolioItem } from "@/types/freelance";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  ensureFreelancerStoreForAccount(auth.user.id);

  const store = await getStoreForAccount(auth.user.id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const portfolio = await listPortfolioForStoreSlug(store.slug);
  return NextResponse.json({
    portfolio,
    persistence: isStorePersistenceActive() ? "supabase" : "json",
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

    const body = (await request.json()) as { portfolio?: PortfolioItem[] };
    const portfolio = await savePortfolioForAccount(auth.user.id, body.portfolio ?? []);
    if (!portfolio) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({
      portfolio,
      persistence: isStorePersistenceActive() ? "supabase" : "json",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("[api/store/portfolio PUT]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
