import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceType,
  TransactionType,
  TriWallet,
  WalletLedgerType,
  WalletTransaction,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/types/billing";

interface DbWalletRow {
  account_id: string;
  pending_balance: number;
  available_balance: number;
  withdrawn_total: number;
  currency: string;
  updated_at: string;
}

interface DbTransactionRow {
  id: string;
  account_id: string;
  type: TransactionType;
  ledger: WalletLedgerType;
  amount: number;
  currency: string;
  order_id: string | null;
  description: string | null;
  metadata: { description_ar?: string } | null;
  created_at: string;
}

interface DbInvoiceRow {
  id: string;
  invoice_number: string;
  account_id: string;
  type: InvoiceType;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  line_items: InvoiceLineItem[] | null;
  stripe_payment_intent_id: string | null;
  transaction_id: string;
  company_tax_id: string | null;
  company_name: string | null;
  company_address: string | null;
  issued_at: string;
}

interface DbWithdrawalRow {
  id: string;
  account_id: string;
  amount: number;
  iban: string;
  bank_name: string;
  account_holder: string;
  status: WithdrawalStatus;
  created_at: string;
}

export function mapDbWalletToTriWallet(row: DbWalletRow): TriWallet {
  return {
    pendingBalance: Number(row.pending_balance),
    availableBalance: Number(row.available_balance),
    withdrawnTotal: Number(row.withdrawn_total),
    currency: "SAR",
  };
}

export function mapDbTransactionToWalletTransaction(row: DbTransactionRow): WalletTransaction {
  return {
    id: row.id,
    type: row.type,
    ledger: row.ledger,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description ?? "",
    descriptionAr: row.metadata?.description_ar,
    createdAt: row.created_at,
  };
}

export function mapDbInvoiceToInvoice(row: DbInvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    type: row.type,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    currency: row.currency,
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    transactionId: row.transaction_id,
    companyTaxId: row.company_tax_id ?? undefined,
    companyName: row.company_name ?? undefined,
    companyAddress: row.company_address ?? undefined,
    issuedAt: row.issued_at,
  };
}

export function mapDbWithdrawalToWithdrawalRequest(row: DbWithdrawalRow): WithdrawalRequest {
  return {
    id: row.id,
    amount: Number(row.amount),
    iban: row.iban,
    bankName: row.bank_name,
    accountHolder: row.account_holder,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapInvoiceToDb(
  accountId: string,
  invoice: Omit<Invoice, "id"> & { id?: string }
): Record<string, unknown> {
  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    account_id: accountId,
    type: invoice.type,
    subtotal: invoice.subtotal,
    tax_amount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    line_items: invoice.lineItems,
    transaction_id: invoice.transactionId,
    company_tax_id: invoice.companyTaxId ?? null,
    company_name: invoice.companyName ?? null,
    company_address: invoice.companyAddress ?? null,
    issued_at: invoice.issuedAt,
  };
}

export async function loadWalletFromSupabase(accountId: string): Promise<TriWallet | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_wallets")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbWalletToTriWallet(data as DbWalletRow);
}

export async function ensureWalletInSupabase(accountId: string): Promise<TriWallet> {
  const existing = await loadWalletFromSupabase(accountId);
  if (existing) return existing;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_wallets")
    .upsert({ account_id: accountId }, { onConflict: "account_id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapDbWalletToTriWallet(data as DbWalletRow);
}

export async function listWalletTransactionsFromSupabase(
  accountId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wallet_transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DbTransactionRow[]).map(mapDbTransactionToWalletTransaction);
}

export async function listInvoicesFromSupabase(accountId: string, limit = 50): Promise<Invoice[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .eq("account_id", accountId)
    .order("issued_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DbInvoiceRow[]).map(mapDbInvoiceToInvoice);
}

export async function loadInvoiceFromSupabase(
  accountId: string,
  invoiceId: string
): Promise<Invoice | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .eq("account_id", accountId)
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbInvoiceToInvoice(data as DbInvoiceRow);
}

export async function insertInvoiceInSupabase(
  accountId: string,
  invoice: Omit<Invoice, "id"> & { id?: string; stripePaymentIntentId?: string }
): Promise<Invoice> {
  const admin = createAdminClient();
  const row = mapInvoiceToDb(accountId, invoice);
  if (invoice.stripePaymentIntentId) {
    row.stripe_payment_intent_id = invoice.stripePaymentIntentId;
  }
  const { data, error } = await admin.from("invoices").insert(row).select("*").single();
  if (error) throw error;
  return mapDbInvoiceToInvoice(data as DbInvoiceRow);
}

export async function createWithdrawalRequestInSupabase(
  accountId: string,
  input: {
    amount: number;
    iban: string;
    bankName: string;
    accountHolder: string;
  }
): Promise<WithdrawalRequest> {
  const admin = createAdminClient();
  const wallet = await ensureWalletInSupabase(accountId);

  if (wallet.availableBalance < input.amount) {
    throw new Error("Insufficient available balance");
  }

  const { data: withdrawal, error: withdrawalError } = await admin
    .from("withdrawal_requests")
    .insert({
      account_id: accountId,
      amount: input.amount,
      iban: input.iban,
      bank_name: input.bankName,
      account_holder: input.accountHolder,
      status: "pending_review",
    })
    .select("*")
    .single();
  if (withdrawalError) throw withdrawalError;

  const { error: walletError } = await admin
    .from("user_wallets")
    .update({
      available_balance: wallet.availableBalance - input.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);
  if (walletError) throw walletError;

  const { error: txError } = await admin.from("wallet_transactions").insert({
    account_id: accountId,
    type: "withdrawal",
    ledger: "available",
    amount: input.amount,
    description: `Withdrawal request to ${input.bankName}`,
    metadata: {
      description_ar: `طلب سحب إلى ${input.bankName}`,
      withdrawal_id: withdrawal.id,
    },
  });
  if (txError) throw txError;

  return mapDbWithdrawalToWithdrawalRequest(withdrawal as DbWithdrawalRow);
}

export async function listAllWithdrawalsFromSupabase(limit = 100): Promise<WithdrawalRequest[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("withdrawal_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DbWithdrawalRow[]).map(mapDbWithdrawalToWithdrawalRequest);
}

export async function processOrderCompletionInSupabase(
  orderId: string,
  sellerId: string,
  total: number
): Promise<{ total: number; commission: number; netEarnings: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_order_completion", {
    p_order_id: orderId,
    p_seller_id: sellerId,
    p_total: total,
  });
  if (error) throw error;

  const result = data as { total: number; commission: number; net_earnings: number };
  return {
    total: Number(result.total),
    commission: Number(result.commission),
    netEarnings: Number(result.net_earnings),
  };
}

export async function getWalletSummaryFromSupabase(): Promise<{
  totalPending: number;
  totalAvailable: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}> {
  const admin = createAdminClient();

  const [{ data: wallets, error: walletError }, { data: withdrawals, error: withdrawalError }] =
    await Promise.all([
      admin.from("user_wallets").select("pending_balance, available_balance, withdrawn_total"),
      admin
        .from("withdrawal_requests")
        .select("amount")
        .eq("status", "pending_review"),
    ]);

  if (walletError) throw walletError;
  if (withdrawalError) throw withdrawalError;

  let totalPending = 0;
  let totalAvailable = 0;
  let totalWithdrawn = 0;

  for (const row of wallets ?? []) {
    totalPending += Number(row.pending_balance);
    totalAvailable += Number(row.available_balance);
    totalWithdrawn += Number(row.withdrawn_total);
  }

  const pendingWithdrawals = (withdrawals ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  return { totalPending, totalAvailable, totalWithdrawn, pendingWithdrawals };
}
