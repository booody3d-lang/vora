import { NextResponse } from "next/server";
import {
  getManualOverride,
  removeManualOverride,
  setManualOverride,
  ensureSubscriptionCacheHydrated,
} from "@/lib/subscription/subscription-store";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import { getAuthenticatedUser, requireSubscriptionManagement } from "@/lib/security/session";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = await params;
  const isSelf = auth.user.id === accountId;
  const isAdmin = requireSubscriptionManagement(auth.user);
  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureSubscriptionCacheHydrated();

  const effective = getEffectiveSubscription(accountId, "user");
  return NextResponse.json({ effective, override: getManualOverride(accountId) });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { accountId } = await params;

  try {
    const body = await request.json();
    const override = await setManualOverride(accountId, {
      tierId: String(body.tierId),
      reason: String(body.reason ?? "Manual admin grant"),
      grantedBy: auth.user.id,
      grantedAt: new Date().toISOString(),
      expiresAt: body.expiresAt || undefined,
    });
    await ensureSubscriptionCacheHydrated();
    const effective = getEffectiveSubscription(accountId, "user");
    return NextResponse.json({ override, effective });
  } catch {
    return NextResponse.json({ error: "Failed to set override" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireSubscriptionManagement(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { accountId } = await params;
  await removeManualOverride(accountId);
  await ensureSubscriptionCacheHydrated();
  return NextResponse.json({ effective: getEffectiveSubscription(accountId, "user") });
}
