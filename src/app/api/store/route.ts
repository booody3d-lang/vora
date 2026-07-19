import { NextResponse } from "next/server";
import { ensureFreelancerStoreForAccount } from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadStoreForAccount,
  saveStoreForAccount,
} from "@/lib/supabase/profile-persistence";
import type { FreelancerStore } from "@/types/freelance";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  ensureFreelancerStoreForAccount(auth.user.id);

  const store = await loadStoreForAccount(auth.user.id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseProfileAndStore(auth.user);
    ensureFreelancerStoreForAccount(auth.user.id);

    const body = (await request.json()) as Partial<FreelancerStore>;
    const store = await saveStoreForAccount(auth.user.id, body);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ store });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("[api/store PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
