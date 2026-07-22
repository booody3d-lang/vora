import "server-only";

import {
  buildMarketplaceInvoice,
  buildSubscriptionInvoice,
  DEMO_INVOICES,
  DEMO_TRANSACTIONS,
  DEMO_WALLET,
  DEMO_WITHDRAWALS,
} from "@/lib/billing/engine";
import {
  createWithdrawalRequestInSupabase,
  ensureWalletInSupabase,
  getWalletSummaryFromSupabase,
  insertInvoiceInSupabase,
  listAllWithdrawalsFromSupabase,
  listInvoicesFromSupabase,
  listWalletTransactionsFromSupabase,
  loadInvoiceFromSupabase,
  loadWalletFromSupabase,
  processOrderCompletionInSupabase,
} from "@/lib/billing/billing-supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import type { Invoice, TriWallet, WalletTransaction, WithdrawalRequest } from "@/types/billing";

let walletTableProbed = false;
let walletTableAvailable = false;

async function isWalletSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (walletTableProbed) return walletTableAvailable;

  walletTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_wallets").select("account_id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("user_wallets missing", error);
      }
      walletTableAvailable = false;
      return false;
    }
    walletTableAvailable = true;
    return true;
  } catch {
    walletTableAvailable = false;
    return false;
  }
}

export async function getAccountWallet(accountId: string): Promise<TriWallet> {
  if (!(await isWalletSupabaseReady())) {
    return DEMO_WALLET;
  }

  return runOptionalDbSync(
    "getAccountWallet",
    () => ensureWalletInSupabase(accountId),
    DEMO_WALLET
  );
}

export async function getAccountWalletTransactions(
  accountId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  if (!(await isWalletSupabaseReady())) {
    return DEMO_TRANSACTIONS;
  }

  return runOptionalDbSync(
    "getAccountWalletTransactions",
    () => listWalletTransactionsFromSupabase(accountId, limit),
    DEMO_TRANSACTIONS
  );
}

export async function getAccountInvoices(accountId: string, limit = 50): Promise<Invoice[]> {
  if (!(await isWalletSupabaseReady())) {
    return DEMO_INVOICES;
  }

  return runOptionalDbSync(
    "getAccountInvoices",
    () => listInvoicesFromSupabase(accountId, limit),
    DEMO_INVOICES
  );
}

export async function getAccountInvoice(
  accountId: string,
  invoiceId: string
): Promise<Invoice | null> {
  if (!(await isWalletSupabaseReady())) {
    return DEMO_INVOICES.find((inv) => inv.id === invoiceId) ?? null;
  }

  return runOptionalDbSync(
    "getAccountInvoice",
    () => loadInvoiceFromSupabase(accountId, invoiceId),
    DEMO_INVOICES.find((inv) => inv.id === invoiceId) ?? null
  );
}

export async function createSubscriptionInvoice(
  accountId: string,
  input: {
    planName: string;
    amount: number;
    stripePaymentIntentId?: string;
    companyDetails?: { name: string; taxId: string; address: string };
  }
): Promise<Invoice> {
  const draft = buildSubscriptionInvoice(input.planName, input.amount, input.companyDetails);

  if (!(await isWalletSupabaseReady())) {
    return { ...draft, id: `inv-${Date.now()}` };
  }

  return runOptionalDbSync(
    "createSubscriptionInvoice",
    () =>
      insertInvoiceInSupabase(accountId, {
        ...draft,
        stripePaymentIntentId: input.stripePaymentIntentId,
      }),
    { ...draft, id: `inv-${Date.now()}` }
  );
}

export async function createMarketplaceInvoice(
  accountId: string,
  input: { orderTotal: number; serviceTitle: string; buyerName: string }
): Promise<Invoice> {
  const draft = buildMarketplaceInvoice(input.orderTotal, input.serviceTitle, input.buyerName);

  if (!(await isWalletSupabaseReady())) {
    return { ...draft, id: `inv-${Date.now()}` };
  }

  return runOptionalDbSync(
    "createMarketplaceInvoice",
    () => insertInvoiceInSupabase(accountId, draft),
    { ...draft, id: `inv-${Date.now()}` }
  );
}

export async function submitWithdrawalRequest(
  accountId: string,
  input: {
    amount: number;
    iban: string;
    bankName: string;
    accountHolder: string;
  }
): Promise<WithdrawalRequest> {
  if (!(await isWalletSupabaseReady())) {
    return {
      id: `wd-${Date.now()}`,
      amount: input.amount,
      iban: input.iban,
      bankName: input.bankName,
      accountHolder: input.accountHolder,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
  }

  return runOptionalDbSync(
    "submitWithdrawalRequest",
    () => createWithdrawalRequestInSupabase(accountId, input),
    {
      id: `wd-${Date.now()}`,
      amount: input.amount,
      iban: input.iban,
      bankName: input.bankName,
      accountHolder: input.accountHolder,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    }
  );
}

export async function completeOrderEscrow(
  orderId: string,
  sellerId: string,
  total: number
): Promise<{ total: number; commission: number; netEarnings: number }> {
  if (!(await isWalletSupabaseReady())) {
    const commission = Math.round(total * 0.1 * 100) / 100;
    return {
      total,
      commission,
      netEarnings: Math.round((total - commission) * 100) / 100,
    };
  }

  return runOptionalDbSync(
    "completeOrderEscrow",
    () => processOrderCompletionInSupabase(orderId, sellerId, total),
    {
      total,
      commission: Math.round(total * 0.1 * 100) / 100,
      netEarnings: Math.round(total * 0.9 * 100) / 100,
    }
  );
}

export async function listAdminWithdrawals(limit = 100): Promise<WithdrawalRequest[]> {
  if (!(await isWalletSupabaseReady())) {
    return DEMO_WITHDRAWALS;
  }

  return runOptionalDbSync(
    "listAdminWithdrawals",
    () => listAllWithdrawalsFromSupabase(limit),
    DEMO_WITHDRAWALS
  );
}

export async function getAdminFinanceSummary(): Promise<{
  totalPending: number;
  totalAvailable: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}> {
  if (!(await isWalletSupabaseReady())) {
    return {
      totalPending: DEMO_WALLET.pendingBalance,
      totalAvailable: DEMO_WALLET.availableBalance,
      totalWithdrawn: DEMO_WALLET.withdrawnTotal,
      pendingWithdrawals: DEMO_WITHDRAWALS.reduce((sum, wd) => sum + wd.amount, 0),
    };
  }

  return runOptionalDbSync(
    "getAdminFinanceSummary",
    () => getWalletSummaryFromSupabase(),
    {
      totalPending: DEMO_WALLET.pendingBalance,
      totalAvailable: DEMO_WALLET.availableBalance,
      totalWithdrawn: DEMO_WALLET.withdrawnTotal,
      pendingWithdrawals: DEMO_WITHDRAWALS.reduce((sum, wd) => sum + wd.amount, 0),
    }
  );
}

export function isWalletPersistenceActive(): boolean {
  return walletTableAvailable;
}

export async function refreshWalletCache(accountId: string): Promise<void> {
  if (!(await isWalletSupabaseReady())) return;
  await runOptionalDbSyncVoid("refreshWalletCache", async () => {
    await loadWalletFromSupabase(accountId);
  });
}
