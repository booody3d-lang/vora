import { NextResponse } from "next/server";
import {
  createSubscriptionTier,
  deleteSubscriptionTier,
  listSubscriptionTiers,
  updateSubscriptionTier,
} from "@/lib/subscription/subscription-store";
import { getAuthenticatedUser, requireSubscriptionManagement } from "@/lib/security/session";
import type { SubscriptionAudience } from "@/types/subscription";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") as SubscriptionAudience | null;
  const tiers = listSubscriptionTiers(audience ?? undefined);
  return NextResponse.json({ tiers });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const tier = createSubscriptionTier({
      nameEn: String(body.nameEn ?? "New Tier"),
      nameAr: String(body.nameAr ?? "باقة جديدة"),
      audience: body.audience === "company" ? "company" : "user",
      priceSar: Number(body.priceSar) || 0,
      billingCycle: body.billingCycle ?? "monthly",
      features: Array.isArray(body.features) ? body.features : [],
      iconUrl: body.iconUrl,
      iconSvg: body.iconSvg,
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json({ error: "Failed to create tier" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const tier = updateSubscriptionTier(body.id, body);
    if (!tier) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json({ error: "Failed to update tier" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteSubscriptionTier(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
