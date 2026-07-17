"use client";

import { useState } from "react";
import Link from "next/link";
import { calculateCommission, formatSar } from "@/lib/billing/engine";
import type { DisputeStatus, DisputeTicket } from "@/types/admin";

interface DisputeDetailViewProps {
  ticket: DisputeTicket;
}

export function DisputeDetailView({ ticket }: DisputeDetailViewProps) {
  const [status, setStatus] = useState<DisputeStatus>(ticket.status);
  const [resolved, setResolved] = useState<string | null>(null);
  const split = calculateCommission(ticket.amount);

  function resolve(action: "refund" | "pay_seller") {
    if (action === "refund") {
      setStatus("resolved_refund");
      setResolved(`Full ${formatSar(ticket.amount)} refunded to ${ticket.buyerName}'s available balance.`);
    } else {
      setStatus("resolved_pay_seller");
      setResolved(
        `Order completed. ${formatSar(split.freelancerNetEarnings)} released to ${ticket.sellerName} (${formatSar(split.platformCommission)} platform fee).`
      );
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/disputes" className="text-sm text-slate-400 hover:text-white">
        ← Back to Dispute Hub
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {status.replace(/_/g, " ")}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-white">{ticket.serviceTitle}</h1>
          <p className="font-mono text-sm text-slate-500">{ticket.orderNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-400">{formatSar(ticket.amount)}</p>
          <p className="text-xs text-slate-500">Escrow locked</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
            <h2 className="font-semibold text-white">Chat Transcript</h2>
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {ticket.messages.map((msg) => (
                <li key={msg.id} className={msg.senderRole === "system" ? "text-center" : ""}>
                  {msg.senderRole === "system" ? (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] text-slate-500">
                      {msg.content}
                    </span>
                  ) : (
                    <div
                      className={`rounded-xl p-3 ${
                        msg.senderRole === "buyer" ? "bg-blue-500/10 ml-8" : "bg-orange-500/10 mr-8"
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-slate-400">{msg.senderName}</p>
                      <p className="mt-1 text-sm text-slate-200">{msg.content}</p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {new Date(msg.createdAt).toLocaleString("en-SA")}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {ticket.attachments.length > 0 && (
            <section className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
              <h2 className="font-semibold text-white">Attachments</h2>
              <ul className="mt-3 space-y-2">
                {ticket.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2">
                    <span className="text-sm text-slate-300">📎 {a.fileName}</span>
                    <span className="text-xs text-slate-500">by {a.uploadedBy}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
            <h2 className="font-semibold text-white">Transaction Log</h2>
            <ul className="mt-3 space-y-2">
              {ticket.transactionLog.map((entry) => (
                <li key={entry.id} className="border-l-2 border-slate-700 pl-3">
                  <p className="text-xs text-slate-300">{entry.action}</p>
                  {entry.amount !== undefined && (
                    <p className="text-xs font-semibold text-amber-400">{formatSar(entry.amount)}</p>
                  )}
                  <p className="text-[10px] text-slate-600">
                    {new Date(entry.timestamp).toLocaleString("en-SA")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
            <h2 className="font-semibold text-white">Dispute Reason</h2>
            <p className="mt-2 text-sm text-slate-400">{ticket.reason}</p>
            <div className="mt-4 rounded-xl bg-slate-900 p-3 text-xs">
              <p className="text-slate-500">If Pay Seller:</p>
              <p className="text-emerald-400">Seller receives {formatSar(split.freelancerNetEarnings)}</p>
              <p className="text-orange-400">Platform fee: {formatSar(split.platformCommission)}</p>
            </div>
          </section>

          {!resolved && status !== "resolved_refund" && status !== "resolved_pay_seller" && (
            <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <h2 className="font-semibold text-red-400">Final Resolution</h2>
              <p className="mt-1 text-xs text-slate-500">Absolute override — irreversible</p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => resolve("refund")}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Refund Buyer — {formatSar(ticket.amount)}
                </button>
                <button
                  type="button"
                  onClick={() => resolve("pay_seller")}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Pay Seller — {formatSar(split.freelancerNetEarnings)}
                </button>
              </div>
            </section>
          )}

          {resolved && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-sm font-semibold text-emerald-400">✓ Dispute Resolved</p>
              <p className="mt-2 text-xs text-slate-400">{resolved}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
