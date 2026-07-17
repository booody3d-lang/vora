"use client";

import { useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { useTranslations } from "@/i18n/use-translations";
import { ADMIN_FINANCIAL_SUMMARY } from "@/lib/admin/mock-data";
import { DEMO_WITHDRAWALS, formatSar } from "@/lib/billing/engine";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types/billing";

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
        <p className="text-sm text-slate-400">Live financial health · All amounts in Saudi Riyal (SR)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Gross Platform Revenue"
          value={formatSar(finance.grossPlatformRevenue)}
          growthPercent={finance.revenueGrowthPercent}
          accent="emerald"
        />
        <MetricCard
          label="Net Subscription Revenue"
          value={formatSar(finance.netSubscriptionRevenue)}
          sublabel="Premium SR 20/120 · Corporate SR 600/yr"
          accent="blue"
        />
        <MetricCard
          label="Net Commission Revenue"
          value={formatSar(finance.netCommissionRevenue)}
          sublabel="10% on completed marketplace sales"
          accent="orange"
        />
        <MetricCard
          label="Active Escrow Liquidity"
          value={formatSar(finance.activeEscrowLiquidity)}
          sublabel="Funds locked in pending orders"
          accent="amber"
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Withdrawal Request Pipeline
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Freelancer</th>
                <th className="px-5 py-3">Bank / IBAN</th>
                <th className="px-5 py-3 text-right">Amount (SR)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((req) => (
                <WithdrawalRow key={req.id} req={req} onUpdate={updateWithdrawal} />
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
}: {
  req: WithdrawalRequest;
  onUpdate: (id: string, status: WithdrawalStatus) => void;
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
        <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString("en-SA")}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-slate-300">{req.bankName}</p>
        <p className="font-mono text-xs text-slate-500">{req.iban}</p>
      </td>
      <td className="px-5 py-4 text-right font-semibold text-emerald-400">{formatSar(req.amount)}</td>
      <td className="px-5 py-4">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[req.status]}`}>
          {req.status.replace(/_/g, " ")}
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
              Approve Transfer
            </button>
            <button
              type="button"
              onClick={() => onUpdate(req.id, "rejected")}
              className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              Reject / Flag
            </button>
          </div>
        )}
        {req.status === "approved" && (
          <button
            type="button"
            onClick={() => onUpdate(req.id, "completed")}
            className="rounded-lg bg-[#EA580C] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Mark Completed
          </button>
        )}
      </td>
    </tr>
  );
}
