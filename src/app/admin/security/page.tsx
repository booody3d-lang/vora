"use client";

import { ADMIN_ABUSE_SIGNALS, ADMIN_AUDIT_LOG, ADMIN_SECURITY_LOG } from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import type { SecurityEventType } from "@/types/admin";

export default function AdminSecurityPage() {
  const { t } = useTranslations();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.security.title")}</h1>
        <p className="text-sm text-slate-400">Live security log · Immutable audit trail · Abuse signals</p>
      </div>

      {/* Security log */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t("admin.security.liveLog")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">IP / Location</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">Severity</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_SECURITY_LOG.map((entry) => (
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

      {/* Audit trail */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Full Audit Trail
        </h2>
        <div className="space-y-2">
          {ADMIN_AUDIT_LOG.map((entry) => (
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

      {/* Abuse signals */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Spam & Abuse Signals
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_ABUSE_SIGNALS.map((signal) => (
            <div
              key={signal.id}
              className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
            >
              <p className="font-semibold text-white">{signal.userName}</p>
              <p className="mt-1 text-sm text-amber-400">{signal.signalType}</p>
              <p className="mt-2 text-xs text-slate-400">
                {signal.count} / {signal.threshold} threshold exceeded
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
