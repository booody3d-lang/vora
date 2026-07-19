"use client";

import { useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { useTranslations } from "@/i18n/use-translations";
import { ADMIN_FINANCIAL_SUMMARY, ADMIN_RECENT_TRANSACTIONS } from "@/lib/admin/mock-data";
import { DEMO_WITHDRAWALS, formatSar } from "@/lib/billing/engine";
import type { AdminTransaction } from "@/types/admin";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types/billing";

const WITHDRAWAL_STATUS_KEYS: Record<WithdrawalStatus, string> = {
  pending_review: "admin.finance.statusPendingReview",
  approved: "admin.finance.statusApproved",
  rejected: "admin.finance.statusRejected",
  completed: "admin.finance.statusCompleted",
};

const TX_TYPE_KEYS: Record<AdminTransaction["type"], string> = {
  subscription: "admin.finance.txSubscription",
  commission: "admin.finance.txCommission",
  escrow_release: "admin.finance.txEscrowRelease",
  withdrawal: "admin.finance.txWithdrawal",
  refund: "admin.finance.txRefund",
};

const TX_STATUS_KEYS: Record<AdminTransaction["status"], string> = {
  completed: "admin.finance.statusCompleted",
  pending: "admin.finance.statusPendingReview",
  failed: "admin.finance.statusFailed",
  processing: "admin.finance.statusProcessing",
};

export default function AdminFinancePage() {
  const { t } = useTranslations();
  const finance = ADMIN_FINANCIAL_SUMMARY;
  const [withdrawals, setWithdrawals] = useState(DEMO_WITHDRAWALS);

  function updateWithdrawal(id: string, status: WithdrawalStatus) {
    setWithdrawals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.finance.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.finance.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("admin.finance.grossRevenue")}
          value={formatSar(finance.grossPlatformRevenue)}
          growthPercent={finance.revenueGrowthPercent}
          accent="emerald"
        />
        <MetricCard
          label={t("admin.finance.netSubscription")}
          value={formatSar(finance.netSubscriptionRevenue)}
          sublabel={t("admin.finance.subscriptionNote")}
          accent="blue"
        />
        <MetricCard
          label={t("admin.finance.netCommission")}
          value={formatSar(finance.netCommissionRevenue)}
          sublabel={t("admin.finance.commissionNote")}
          accent="orange"
        />
        <MetricCard
          label={t("admin.finance.escrowLiquidity")}
          value={formatSar(finance.activeEscrowLiquidity)}
          sublabel={t("admin.finance.escrowNote")}
          accent="amber"
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.finance.transactions")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-start text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("admin.finance.colType")}</th>
                <th className="px-5 py-3">{t("admin.finance.colReference")}</th>
                <th className="px-5 py-3">{t("admin.finance.colParty")}</th>
                <th className="px-5 py-3 text-end">{t("admin.finance.colAmount")}</th>
                <th className="px-5 py-3">{t("admin.finance.colStatus")}</th>
                <th className="px-5 py-3">{t("admin.finance.colDate")}</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-800">
                  <td className="px-5 py-3 text-slate-300">{t(TX_TYPE_KEYS[tx.type])}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{tx.reference}</td>
                  <td className="px-5 py-3 text-slate-300">{tx.party}</td>
                  <td className="px-5 py-3 text-end font-semibold text-emerald-400">{formatSar(tx.amount)}</td>
                  <td className="px-5 py-3 text-slate-400">{t(TX_STATUS_KEYS[tx.status])}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.finance.withdrawals")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-start text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("admin.finance.colFreelancer")}</th>
                <th className="px-5 py-3">{t("admin.finance.colBank")}</th>
                <th className="px-5 py-3 text-end">{t("admin.finance.colAmount")}</th>
                <th className="px-5 py-3">{t("admin.finance.colStatus")}</th>
                <th className="px-5 py-3">{t("admin.finance.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((req) => (
                <WithdrawalRow key={req.id} req={req} onUpdate={updateWithdrawal} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function WithdrawalRow({
  req,
  onUpdate,
  t,
}: {
  req: WithdrawalRequest;
  onUpdate: (id: string, status: WithdrawalStatus) => void;
  t: (key: string) => string;
}) {
  const statusColors: Record<WithdrawalStatus, string> = {
    pending_review: "bg-amber-500/20 text-amber-400",
    approved: "bg-blue-500/20 text-blue-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <tr className="border-b border-slate-800">
      <td className="px-5 py-4">
        <p className="font-medium text-white">{req.accountHolder}</p>
        <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-slate-300">{req.bankName}</p>
        <p className="font-mono text-xs text-slate-500">{req.iban}</p>
      </td>
      <td className="px-5 py-4 text-end font-semibold text-emerald-400">{formatSar(req.amount)}</td>
      <td className="px-5 py-4">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[req.status]}`}>
          {t(WITHDRAWAL_STATUS_KEYS[req.status])}
        </span>
      </td>
      <td className="px-5 py-4">
        {req.status === "pending_review" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate(req.id, "approved")}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {t("admin.finance.approveTransfer")}
            </button>
            <button
              type="button"
              onClick={() => onUpdate(req.id, "rejected")}
              className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              {t("admin.finance.rejectFlag")}
            </button>
          </div>
        )}
        {req.status === "approved" && (
          <button
            type="button"
            onClick={() => onUpdate(req.id, "completed")}
            className="rounded-lg bg-[#EA580C] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("admin.finance.markCompleted")}
          </button>
        )}
      </td>
    </tr>
  );
}
