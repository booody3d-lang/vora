"use client";

import { useEffect, useState } from "react";
import { WithdrawForm } from "@/components/billing/WithdrawForm";
import { TriWalletCards } from "@/components/billing/TriWalletCards";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_WALLET } from "@/lib/billing/engine";
import type { TriWallet } from "@/types/billing";

export function WithdrawPageContent() {
  const { t } = useTranslations();
  const [wallet, setWallet] = useState<TriWallet>(DEMO_WALLET);

  useEffect(() => {
    fetch("/api/billing/wallet")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { wallet?: TriWallet } | null) => {
        if (data?.wallet) setWallet(data.wallet);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.withdraw.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.withdraw.subtitle")}</p>
      </div>

      <TriWalletCards wallet={wallet} />
      <WithdrawForm wallet={wallet} />
    </div>
  );
}
