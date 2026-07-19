import { NextResponse } from "next/server";
import {
  getStoreByAccountId,
  ensureFreelancerStoreForAccount,
  updateStoreForAccount,
} from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { FreelancerStore } from "@/types/freelance";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let store = getStoreByAccountId(auth.user.id);
  if (!store) {
    ensureFreelancerStoreForAccount(auth.user.id);
    store = getStoreByAccountId(auth.user.id);
  }
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
    const body = (await request.json()) as Partial<FreelancerStore>;
    ensureFreelancerStoreForAccount(auth.user.id);
    const store = updateStoreForAccount(auth.user.id, body);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ store });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
