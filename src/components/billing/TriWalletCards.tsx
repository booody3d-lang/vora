"use client";

import type { TriWallet } from "@/types/billing";
import { formatSar } from "@/lib/billing/engine";

interface TriWalletCardsProps {
  wallet: TriWallet;
}

export function TriWalletCards({ wallet }: TriWalletCardsProps) {
  const cards = [
    {
      label: "Pending Balance",
      labelAr: "الرصيد المعلق",
      value: wallet.pendingBalance,
      description: "Funds locked in Escrow from active orders",
      color: "border-amber-200 bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      label: "Available Balance",
      labelAr: "الرصيد المتاح",
      value: wallet.availableBalance,
      description: "Ready for withdrawal or platform use",
      color: "border-emerald-200 bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      label: "Withdrawn Total",
      labelAr: "إجمالي المسحوب",
      value: wallet.withdrawnTotal,
      description: "Historical sum of all extracted capital",
      color: "border-slate-200 bg-slate-50",
      textColor: "text-slate-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.color}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.textColor}`}>{formatSar(card.value)}</p>
          <p className="mt-2 text-[10px] text-slate-400">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
