import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminTransaction } from "@/types/admin";
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

interface DbAccountNameRow {
  full_name: string | null;
  email: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidBillingUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface AdminFinanceMetrics {
  grossPlatformRevenue: number;
  netSubscriptionRevenue: number;
  netCommissionRevenue: number;
  activeEscrowLiquidity: number;
  totalEscrow: number;
  availablePayouts: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  revenueGrowthPercent: number;
}

function mapWalletTxTypeToAdminType(type: TransactionType): AdminTransaction["type"] {
  switch (type) {
    case "subscription_payment":
      return "subscription";
    case "platform_commission":
      return "commission";
    case "order_release":
    case "order_escrow":
      return "escrow_release";
    case "withdrawal":
    case "withdrawal_completed":
      return "withdrawal";
    case "refund":
      return "refund";
    default:
      return "escrow_release";
  }
}

function mapWalletTxTypeToAdminStatus(type: TransactionType): AdminTransaction["status"] {
  if (type === "order_escrow" || type === "withdrawal") return "pending";
  if (type === "order_release") return "processing";
  return "completed";
}

function resolveAdminTransactionReference(row: DbTransactionRow): string {
  const metadata = row.metadata as { withdrawal_id?: string; demo_order_id?: string } | null;
  if (row.order_id) return row.order_id.slice(0, 8).toUpperCase();
  if (metadata?.demo_order_id) return metadata.demo_order_id;
  if (metadata?.withdrawal_id) return metadata.withdrawal_id.slice(0, 8).toUpperCase();
  return row.id.slice(0, 8).toUpperCase();
}

export function mapWalletTransactionRowToAdminTransaction(
  row: DbTransactionRow & {
    accounts?: DbAccountNameRow | DbAccountNameRow[] | null;
  }
): AdminTransaction {
  const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
  const party = account?.full_name?.trim() || account?.email || row.account_id.slice(0, 8);

  return {
    id: row.id,
    type: mapWalletTxTypeToAdminType(row.type),
    reference: resolveAdminTransactionReference(row),
    party,
    amount: Number(row.amount),
    status: mapWalletTxTypeToAdminStatus(row.type),
    createdAt: row.created_at,
  };
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

async function processOrderEscrowPaymentManual(
  orderRef: string,
  sellerId: string,
  buyerId: string,
  total: number,
  description: string
): Promise<{ duplicate: boolean; total: number }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("account_id", sellerId)
    .eq("type", "order_escrow")
    .contains("metadata", { demo_order_id: orderRef })
    .maybeSingle();

  if (existing) {
    return { duplicate: true, total };
  }

  await ensureWalletInSupabase(sellerId);

  const wallet = await loadWalletFromSupabase(sellerId);
  if (!wallet) throw new Error("Seller wallet unavailable");

  const { error: walletError } = await admin
    .from("user_wallets")
    .update({
      pending_balance: wallet.pendingBalance + total,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", sellerId);
  if (walletError) throw walletError;

  const { error: txError } = await admin.from("wallet_transactions").insert({
    account_id: sellerId,
    type: "order_escrow",
    ledger: "pending",
    amount: total,
    order_id: null,
    description,
    metadata: {
      buyer_id: buyerId,
      demo_order_id: orderRef,
      description_ar: "دفع الطلب — escrow",
    },
  });
  if (txError) throw txError;

  if (isValidBillingUuid(buyerId)) {
    await admin.from("payment_records").insert({
      account_id: buyerId,
      amount: total,
      order_id: null,
      status: "completed",
    });
  }

  return { duplicate: false, total };
}

export async function processOrderEscrowPaymentInSupabase(
  orderId: string,
  sellerId: string,
  buyerId: string,
  total: number,
  description?: string
): Promise<{ duplicate: boolean; total: number }> {
  const label = description ?? `Order escrow payment — ${orderId}`;

  if (!isValidBillingUuid(orderId)) {
    return processOrderEscrowPaymentManual(orderId, sellerId, buyerId, total, label);
  }

  if (!isValidBillingUuid(sellerId) || !isValidBillingUuid(buyerId)) {
    return processOrderEscrowPaymentManual(orderId, sellerId, buyerId, total, label);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_order_escrow_payment", {
    p_order_id: orderId,
    p_seller_id: sellerId,
    p_buyer_id: buyerId,
    p_total: total,
    p_description: label,
  });
  if (error) throw error;

  const result = data as { duplicate?: boolean; total?: number };
  return {
    duplicate: Boolean(result.duplicate),
    total: Number(result.total ?? total),
  };
}

export async function reviewWithdrawalRequestInSupabase(
  withdrawalId: string,
  status: Extract<WithdrawalStatus, "approved" | "rejected" | "completed">,
  reviewedBy: string,
  adminNotes?: string
): Promise<WithdrawalRequest> {
  if (!isValidBillingUuid(withdrawalId)) {
    throw new Error("Invalid withdrawal id");
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("review_withdrawal_request", {
    p_withdrawal_id: withdrawalId,
    p_status: status,
    p_reviewed_by: reviewedBy,
    p_admin_notes: adminNotes ?? null,
  });
  if (error) throw error;

  const { data, error: loadError } = await admin
    .from("withdrawal_requests")
    .select("*")
    .eq("id", withdrawalId)
    .single();
  if (loadError) throw loadError;

  return mapDbWithdrawalToWithdrawalRequest(data as DbWithdrawalRow);
}

export async function listAdminFinanceTransactionsFromSupabase(
  limit = 50
): Promise<AdminTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wallet_transactions")
    .select("*, accounts(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as Array<
    DbTransactionRow & { accounts?: DbAccountNameRow | DbAccountNameRow[] | null }
  >).map(mapWalletTransactionRowToAdminTransaction);
}

export async function getAdminFinanceMetricsFromSupabase(): Promise<AdminFinanceMetrics> {
  const admin = createAdminClient();

  const [
    walletSummary,
    { data: invoiceRows, error: invoiceError },
    { data: commissionRows, error: commissionError },
  ] = await Promise.all([
    getWalletSummaryFromSupabase(),
    admin.from("invoices").select("type, total"),
    admin.from("wallet_transactions").select("amount").eq("type", "platform_commission"),
  ]);

  if (invoiceError) throw invoiceError;
  if (commissionError) throw commissionError;

  const netSubscriptionRevenue = (invoiceRows ?? [])
    .filter((row) => row.type === "subscription")
    .reduce((sum, row) => sum + Number(row.total), 0);

  const netCommissionRevenue = (commissionRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const grossPlatformRevenue = netSubscriptionRevenue + netCommissionRevenue;

  return {
    grossPlatformRevenue,
    netSubscriptionRevenue,
    netCommissionRevenue,
    activeEscrowLiquidity: walletSummary.totalPending,
    totalEscrow: walletSummary.totalPending,
    availablePayouts: walletSummary.totalAvailable,
    totalWithdrawn: walletSummary.totalWithdrawn,
    pendingWithdrawals: walletSummary.pendingWithdrawals,
    revenueGrowthPercent: 0,
  };
}
