import { NextResponse } from "next/server";
import { reviewWithdrawalRequest } from "@/lib/billing/wallet-store";
import { forbidFinancialAccess } from "@/lib/security/financial-guard";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { WithdrawalStatus } from "@/types/billing";

const ALLOWED_STATUSES = new Set<WithdrawalStatus>(["approved", "rejected", "completed"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  const denied = forbidFinancialAccess(auth?.user);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: WithdrawalStatus;
      adminNotes?: string;
    };

    if (!body.status || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "status must be approved, rejected, or completed" },
        { status: 400 }
      );
    }

    const withdrawal = await reviewWithdrawalRequest(
      id,
      body.status as Extract<WithdrawalStatus, "approved" | "rejected" | "completed">,
      auth!.user.id,
      body.adminNotes
    );

    return NextResponse.json({ success: true, withdrawal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update withdrawal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
