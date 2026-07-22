import { NextResponse } from "next/server";
import {
  createOrderForBuyer,
  isOrdersPersistenceActive,
  listOrdersForAccount,
} from "@/lib/freelance/orders-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const orders = await listOrdersForAccount(auth.user.id);

  return NextResponse.json({
    orders,
    persistence: isOrdersPersistenceActive() ? "supabase" : "json",
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseProfileAndStore(auth.user);

    const body = (await request.json()) as {
      serviceSlug?: string;
      selectedAddonIds?: string[];
    };

    if (!body.serviceSlug?.trim()) {
      return NextResponse.json({ error: "serviceSlug is required" }, { status: 400 });
    }

    const order = await createOrderForBuyer(auth.user.id, {
      serviceSlug: body.serviceSlug.trim(),
      selectedAddonIds: body.selectedAddonIds ?? [],
    });

    if (!order) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({
      order,
      persistence: isOrdersPersistenceActive() ? "supabase" : "json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
