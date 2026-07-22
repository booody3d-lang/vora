import { NextResponse } from "next/server";
import {
  getStripeConfig,
  getStripeConfigPublicView,
  updateStripeConfig,
} from "@/lib/security/auth-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  const config = getStripeConfig();
  return NextResponse.json({
    public: getStripeConfigPublicView(),
    config: {
      secretKey: config.secretKey ? maskSecret(config.secretKey) : undefined,
      publishableKey: config.publishableKey,
      webhookSecret: config.webhookSecret ? maskSecret(config.webhookSecret) : undefined,
      updatedAt: config.updatedAt,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      secretKey?: string;
      publishableKey?: string;
      webhookSecret?: string;
    };

    const updated = updateStripeConfig(
      {
        secretKey: body.secretKey,
        publishableKey: body.publishableKey,
        webhookSecret: body.webhookSecret,
      },
      auth.user.id
    );

    return NextResponse.json({
      ok: true,
      public: getStripeConfigPublicView(),
      updatedAt: updated.updatedAt,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update Stripe config" }, { status: 400 });
  }
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
