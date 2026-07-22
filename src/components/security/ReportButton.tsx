"use client";

import { networkTextareaClass } from "@/components/network/ui/field-styles";

import { useState } from "react";
import type { ReportTargetType } from "@/types/security";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  variant?: "icon" | "text";
}

const REASONS = [
  "Spam or misleading content",
  "Harassment or abuse",
  "Fake profile or scam",
  "Copyright violation",
  "Inappropriate content",
  "Other",
];

export function ReportButton({ targetType, targetId, targetLabel, variant = "icon" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await fetch("/api/security/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, targetLabel, reason, details }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit report");
      return;
    }
    setSubmitted(true);
    setTimeout(() => { setOpen(false); setSubmitted(false); }, 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "icon" ? "rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" : "text-xs text-red-500 hover:underline"}
        title="Report"
      >
        {variant === "icon" ? "🚩" : "Report"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0F172A]">Report Content</h3>
            <p className="mt-1 text-sm text-slate-500">{targetLabel}</p>

            {submitted ? (
              <p className="mt-4 text-center text-sm text-emerald-600">Report submitted. Admin team notified.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Additional details (optional)" className={networkTextareaClass} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm">Cancel</button>
                  <button type="button" onClick={submit} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white">Submit Report</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
