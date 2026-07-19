"use client";

import Link from "next/link";
import { useTranslations } from "@/i18n/use-translations";
import { ADMIN_DISPUTES } from "@/lib/admin/mock-data";
import { formatSar } from "@/lib/billing/engine";
import type { DisputeStatus } from "@/types/admin";

export default function AdminDisputesPage() {
  const { t } = useTranslations();
  const urgent = ADMIN_DISPUTES.filter((d) => d.status === "urgent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.disputes.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.disputes.subtitle")}</p>
      </div>

      {urgent.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {t("admin.disputes.urgentBanner").replace("{count}", String(urgent.length))}
        </div>
      )}

      <div className="space-y-3">
        {ADMIN_DISPUTES.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/admin/disputes/${ticket.id}`}
            className="block rounded-2xl border border-slate-700/50 bg-[#111827] p-5 transition-colors hover:border-slate-600"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <span className="font-mono text-xs text-slate-500">{ticket.orderNumber}</span>
                </div>
                <h3 className="mt-2 font-semibold text-white">{ticket.serviceTitle}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {ticket.buyerName} vs {ticket.sellerName}
                </p>
                <p className="mt-2 text-xs text-slate-500">{ticket.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-400">{formatSar(ticket.amount)}</p>
                <p className="text-xs text-slate-500">
                  {t("admin.disputes.opened")}{" "}
                  {new Date(ticket.openedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const config: Record<DisputeStatus, { label: string; className: string }> = {
    urgent: { label: "Urgent", className: "bg-red-600 text-white animate-pulse" },
    in_review: { label: "In Review", className: "bg-amber-500/20 text-amber-400" },
    resolved_refund: { label: "Refunded", className: "bg-blue-500/20 text-blue-400" },
    resolved_pay_seller: { label: "Paid Seller", className: "bg-emerald-500/20 text-emerald-400" },
  };
  const c = config[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.className}`}>
      {c.label}
    </span>
  );
}
