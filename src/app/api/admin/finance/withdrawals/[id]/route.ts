import { NextResponse } from "next/server";
import { getAdminFinanceSnapshot, reviewAdminWithdrawal } from "@/lib/admin/admin-finance-store";
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

    const withdrawal = await reviewAdminWithdrawal(
      id,
      body.status as Extract<WithdrawalStatus, "approved" | "rejected" | "completed">,
      auth!.user.id,
      body.adminNotes
    );

    const snapshot = await getAdminFinanceSnapshot();

    return NextResponse.json({
      success: true,
      withdrawal,
      summary: snapshot.summary,
      persistence: snapshot.persistence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update withdrawal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
