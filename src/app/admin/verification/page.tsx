"use client";

import { useState } from "react";
import { ADMIN_VERIFICATION_QUEUE } from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import type { VerificationStatus } from "@/types/admin";

export default function AdminVerificationPage() {
  const { t } = useTranslations();
  const [queue, setQueue] = useState(ADMIN_VERIFICATION_QUEUE);

  function updateStatus(id: string, status: VerificationStatus) {
    setQueue((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  const pending = queue.filter((v) => v.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.verification.title")}</h1>
        <p className="text-sm text-slate-400">
          Review identification documents & commercial registers for Official Verification Badge
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        {pending.length} application{pending.length !== 1 ? "s" : ""} pending review
      </div>

      <div className="space-y-4">
        {queue.map((app) => (
          <div
            key={app.id}
            className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{app.applicantName}</h3>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] capitalize text-slate-300">
                    {app.applicantType}
                  </span>
                  <StatusBadge status={app.status} />
                </div>
                <p className="mt-1 text-sm text-slate-400">{app.documentType}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {new Date(app.submittedAt).toLocaleString("en-SA")}
                </p>
              </div>
              {app.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(app.id, "approved")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Approve Badge
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(app.id, "rejected")}
                    className="rounded-lg bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
              <p className="text-sm text-slate-500">📄 Document Preview</p>
              <p className="mt-1 text-xs text-slate-600">{app.documentType} — click to view full document</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const colors = {
    pending: "bg-amber-500/20 text-amber-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colors[status]}`}>
      {status}
    </span>
  );
}
