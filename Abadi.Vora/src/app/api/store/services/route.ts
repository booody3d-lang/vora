import { NextResponse } from "next/server";
import {
  getStoreServicesForAccount,
  saveStoreServicesForAccount,
} from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { MarketplaceService } from "@/types/freelance";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = getStoreServicesForAccount(auth.user.id);
  return NextResponse.json({ services });
}

export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { services: MarketplaceService[] };
    const services = saveStoreServicesForAccount(auth.user.id, body.services ?? []);
    if (!services) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ services });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
