"use client";

import Link from "next/link";
import { TriWalletCards } from "@/components/billing/TriWalletCards";
import { CommissionBreakdown } from "@/components/billing/CommissionBreakdown";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_WALLET, DEMO_TRANSACTIONS, formatSar } from "@/lib/billing/engine";
import type { TransactionType, WalletLedgerType } from "@/types/billing";

const TX_TYPE_KEYS: Record<TransactionType, string> = {
  order_escrow: "billing.wallet.typeOrderEscrow",
  order_release: "billing.wallet.typeOrderRelease",
  platform_commission: "billing.wallet.typePlatformCommission",
  subscription_payment: "billing.wallet.typeSubscriptionPayment",
  withdrawal: "billing.wallet.typeWithdrawal",
  withdrawal_completed: "billing.wallet.typeWithdrawalCompleted",
  refund: "billing.wallet.typeRefund",
};

const LEDGER_KEYS: Record<WalletLedgerType, string> = {
  pending: "billing.wallet.ledgerPending",
  available: "billing.wallet.ledgerAvailable",
  withdrawn: "billing.wallet.ledgerWithdrawn",
};

export function WalletPageContent() {
  const { t } = useTranslations();
  const { locale } = useLocale();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.wallet.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.wallet.subtitle")}</p>
      </div>

      <TriWalletCards wallet={DEMO_WALLET} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#0F172A]">{t("billing.wallet.recentTransactions")}</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {DEMO_TRANSACTIONS.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {locale === "ar" && tx.descriptionAr ? tx.descriptionAr : tx.description}
                  </p>
                  <p className="text-[10px] uppercase text-slate-400">
                    {t(LEDGER_KEYS[tx.ledger])} · {t(TX_TYPE_KEYS[tx.type])}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    tx.type.includes("commission") || tx.type === "withdrawal_completed"
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {tx.type.includes("commission") ? "−" : "+"}
                  {formatSar(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <CommissionBreakdown orderTotal={299} showExample />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/billing/withdraw"
          className="rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("billing.wallet.withdrawFunds")}
        </Link>
        <Link
          href="/billing/invoices"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("billing.wallet.viewInvoices")}
        </Link>
      </div>
    </div>
  );
}
