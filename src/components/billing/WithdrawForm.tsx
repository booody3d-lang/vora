"use client";

import { useState } from "react";
import { canWithdraw, formatSar } from "@/lib/billing/engine";
import { useNotificationTrigger } from "@/hooks/useNotificationTrigger";
import { useTranslations } from "@/i18n/use-translations";
import { MIN_WITHDRAWAL_SAR, type TriWallet } from "@/types/billing";
import type { NotificationPayload } from "@/types/notifications";

interface WithdrawFormProps {
  wallet: TriWallet;
  onSubmit?: (data: { amount: number; iban: string; bankName: string; accountHolder: string }) => void;
}

export function WithdrawForm({ wallet, onSubmit }: WithdrawFormProps) {
  const { t } = useTranslations();
  const { fire } = useNotificationTrigger();
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const validation = canWithdraw(numAmount, wallet.availableBalance);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation.allowed) {
      setError(validation.reason ?? t("billing.withdraw.invalidAmount"));
      return;
    }
    if (!iban.trim() || !bankName.trim() || !accountHolder.trim()) {
      setError(t("billing.withdraw.requiredFields"));
      return;
    }
    onSubmit?.({ amount: numAmount, iban, bankName, accountHolder });
    fetch("/api/billing/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: numAmount,
        iban,
        bankName,
        accountHolder,
      }),
    })
      .then((res) => res.json())
      .then((data: { ownerAlert?: NotificationPayload }) => {
        if (data.ownerAlert) void fire(data.ownerAlert);
      })
      .catch(() => {});
    setSubmitted(true);
    setError(null);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="text-3xl">✓</span>
        <h3 className="mt-2 text-lg font-bold text-emerald-800">{t("billing.withdraw.successTitle")}</h3>
        <p className="mt-2 text-sm text-emerald-700">
          {t("billing.withdraw.successBody").replace("{amount}", formatSar(numAmount))}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#0F172A]">{t("billing.withdraw.bankTitle")}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {t("billing.withdraw.availableHint")
          .replace("{min}", formatSar(MIN_WITHDRAWAL_SAR))
          .replace("{available}", formatSar(wallet.availableBalance))}
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600">{t("billing.withdraw.amount")}</label>
          <input
            type="number"
            min={MIN_WITHDRAWAL_SAR}
            max={wallet.availableBalance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            placeholder={t("billing.withdraw.minAmount").replace("{amount}", String(MIN_WITHDRAWAL_SAR))}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("billing.withdraw.accountHolder")}</label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("billing.withdraw.bankName")}</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            placeholder={t("billing.withdraw.bankPlaceholder")}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">{t("billing.withdraw.iban")}</label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            placeholder={t("billing.withdraw.ibanPlaceholder")}
            pattern="SA[0-9]{2}[0-9A-Z ]{20,}"
            required
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!validation.allowed}
        className="mt-6 w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("billing.withdraw.submit")}
      </button>
    </form>
  );
}
