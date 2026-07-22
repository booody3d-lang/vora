"use client";

import type { TriWallet } from "@/types/billing";
import { formatSar } from "@/lib/billing/engine";
import { useTranslations } from "@/i18n/use-translations";

interface TriWalletCardsProps {
  wallet: TriWallet;
}

export function TriWalletCards({ wallet }: TriWalletCardsProps) {
  const { t } = useTranslations();

  const cards = [
    {
      labelKey: "billing.wallet.pending",
      descKey: "billing.wallet.pendingDesc",
      value: wallet.pendingBalance,
      color: "border-amber-200 bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      labelKey: "billing.wallet.available",
      descKey: "billing.wallet.availableDesc",
      value: wallet.availableBalance,
      color: "border-emerald-200 bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      labelKey: "billing.wallet.withdrawn",
      descKey: "billing.wallet.withdrawnDesc",
      value: wallet.withdrawnTotal,
      color: "border-slate-200 bg-slate-50",
      textColor: "text-slate-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.labelKey} className={`rounded-2xl border p-5 shadow-sm ${card.color}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t(card.labelKey)}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.textColor}`}>{formatSar(card.value)}</p>
          <p className="mt-2 text-[10px] text-slate-400">{t(card.descKey)}</p>
        </div>
      ))}
    </div>
  );
}
