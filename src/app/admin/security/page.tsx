"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_ABUSE_SIGNALS, ADMIN_AUDIT_LOG, ADMIN_SECURITY_LOG } from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import type { AbuseSignal, AuditLogEntry, SecurityEventType, SecurityLogEntry } from "@/types/admin";

export default function AdminSecurityPage() {
  const { t } = useTranslations();
  const [securityLog, setSecurityLog] = useState<SecurityLogEntry[]>(ADMIN_SECURITY_LOG);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(ADMIN_AUDIT_LOG);
  const [abuseSignals, setAbuseSignals] = useState<AbuseSignal[]>(ADMIN_ABUSE_SIGNALS);
  const [persistence, setPersistence] = useState<"supabase" | "demo">("demo");

  const loadSecurity = useCallback(() => {
    fetch("/api/admin/security")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            securityLog?: SecurityLogEntry[];
            auditLog?: AuditLogEntry[];
            abuseSignals?: AbuseSignal[];
            persistence?: "supabase" | "demo";
          } | null
        ) => {
          if (data?.securityLog) setSecurityLog(data.securityLog);
          if (data?.auditLog) setAuditLog(data.auditLog);
          if (data?.abuseSignals) setAbuseSignals(data.abuseSignals);
          if (data?.persistence) setPersistence(data.persistence);
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.security.title")}</h1>
          <p className="text-sm text-slate-400">{t("admin.security.subtitle")}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {persistence === "supabase" ? "Supabase live" : "Demo fallback"}
        </span>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.security.liveLog")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("admin.security.type")}</th>
                <th className="px-5 py-3">{t("admin.security.user")}</th>
                <th className="px-5 py-3">{t("admin.security.ipLocation")}</th>
                <th className="px-5 py-3">{t("admin.security.details")}</th>
                <th className="px-5 py-3">{t("admin.security.severity")}</th>
              </tr>
            </thead>
            <tbody>
              {securityLog.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-800">
                  <td className="px-5 py-3">
                    <EventTypeBadge type={entry.type} />
                  </td>
                  <td className="px-5 py-3 text-slate-300">{entry.userEmail}</td>
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs text-slate-400">{entry.ipAddress}</p>
                    <p className="text-[10px] text-slate-600">{entry.location}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{entry.details}</td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={entry.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.security.auditTrail")}
        </h2>
        <div className="space-y-2">
          {auditLog.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
            >
              <span className="text-xs text-slate-500">
                {new Date(entry.timestamp).toLocaleString("en-SA")}
              </span>
              <span className="font-semibold text-red-400">{entry.adminName}</span>
              <span className="text-slate-400">{entry.action}</span>
              <span className="text-white">→ {entry.target}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.security.abuseSignals")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {abuseSignals.map((signal) => (
            <div
              key={signal.id}
              className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
            >
              <p className="font-semibold text-white">{signal.userName}</p>
              <p className="mt-1 text-sm text-amber-400">{signal.signalType}</p>
              <p className="mt-2 text-xs text-slate-400">
                {t("admin.security.abuseThreshold")
                  .replace("{count}", String(signal.count))
                  .replace("{threshold}", String(signal.threshold))}
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                {new Date(signal.timestamp).toLocaleString("en-SA")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EventTypeBadge({ type }: { type: SecurityEventType }) {
  const labels: Record<SecurityEventType, string> = {
    failed_login: "Failed Login",
    multi_device: "Multi-Device",
    ip_anomaly: "IP Anomaly",
    rate_limit: "Rate Limit",
  };
  return (
    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
      {labels[type]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-slate-500/20 text-slate-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colors[severity]}`}>
      {severity}
    </span>
  );
}
