"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_VERIFICATION_QUEUE } from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import type { VerificationApplication, VerificationStatus } from "@/types/admin";

export default function AdminVerificationPage() {
  const { t } = useTranslations();
  const [queue, setQueue] = useState(ADMIN_VERIFICATION_QUEUE);
  const [persistence, setPersistence] = useState<"supabase" | "json">("json");

  const loadQueue = useCallback(() => {
    fetch("/api/admin/verification")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            queue?: VerificationApplication[];
            persistence?: "supabase" | "json";
          } | null
        ) => {
          if (data?.queue) setQueue(data.queue);
          if (data?.persistence) setPersistence(data.persistence);
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function updateStatus(id: string, status: VerificationStatus) {
    const previous = queue;
    setQueue((prev) => prev.map((app) => (app.id === id ? { ...app, status } : app)));

    const res = await fetch(`/api/admin/verification/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setQueue(previous);
      return;
    }

    const data = (await res.json()) as { application?: VerificationApplication };
    if (data.application) {
      setQueue((prev) => prev.map((app) => (app.id === id ? data.application! : app)));
    }
  }

  const pending = queue.filter((app) => app.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.verification.title")}</h1>
          <p className="text-sm text-slate-400">{t("admin.verification.subtitle")}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {persistence === "supabase" ? "Supabase live" : "Demo fallback"}
        </span>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        {t("admin.verification.pendingBanner").replace("{count}", String(pending.length))}
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
                  {t("admin.verification.submitted")}{" "}
                  {new Date(app.submittedAt).toLocaleString()}
                </p>
              </div>
              {app.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void updateStatus(app.id, "approved")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    {t("admin.verification.approveBadge")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateStatus(app.id, "rejected")}
                    className="rounded-lg bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    {t("admin.verification.reject")}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
              <p className="text-sm text-slate-500">{t("admin.verification.documentPreview")}</p>
              <p className="mt-1 text-xs text-slate-600">
                {t("admin.verification.documentHint").replace("{type}", app.documentType)}
              </p>
              {app.documentUrl && app.documentUrl !== "#" && (
                <a
                  href={app.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300"
                >
                  {t("admin.verification.openDocument")}
                </a>
              )}
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
