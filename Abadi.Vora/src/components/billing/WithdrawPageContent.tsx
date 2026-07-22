"use client";

import { WithdrawForm } from "@/components/billing/WithdrawForm";
import { TriWalletCards } from "@/components/billing/TriWalletCards";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_WALLET } from "@/lib/billing/engine";

export function WithdrawPageContent() {
  const { t } = useTranslations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.withdraw.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.withdraw.subtitle")}</p>
      </div>

      <TriWalletCards wallet={DEMO_WALLET} />
      <WithdrawForm wallet={DEMO_WALLET} />
    </div>
  );
}
