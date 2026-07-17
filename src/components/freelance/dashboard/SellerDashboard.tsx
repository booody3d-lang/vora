"use client";

import type { SellerAnalytics } from "@/types/freelance";

interface SellerDashboardProps {
  analytics: SellerAnalytics;
  storeName: string;
}

export function SellerDashboard({ analytics, storeName }: SellerDashboardProps) {
  const maxRevenue = Math.max(...analytics.monthlyRevenue.map((m) => m.revenue));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">{storeName}</h1>
        <p className="text-sm text-slate-500">Seller Analytics Dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Store Views" value={analytics.totalViews.toLocaleString()} />
        <StatCard label="Active Orders" value={String(analytics.activeOrders)} highlight />
        <StatCard label="Total Revenue" value={`SAR ${analytics.totalRevenue.toLocaleString()}`} />
        <StatCard label="Conversion Rate" value={`${analytics.conversionRate}%`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">Monthly Income</h2>
          <div className="mt-4 flex h-40 items-end gap-3">
            {analytics.monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-[#EA580C]">
                  {(m.revenue / 1000).toFixed(1)}K
                </span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#EA580C] to-[#F59E0B]"
                  style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: 8 }}
                />
                <span className="text-[10px] text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">Top Performing Services</h2>
          <ul className="mt-4 space-y-3">
            {analytics.topServices.map((svc, i) => (
              <li key={svc.title} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EA580C]/10 text-xs font-bold text-[#EA580C]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0F172A]">{svc.title}</p>
                  <p className="text-xs text-slate-400">{svc.sales} sales</p>
                </div>
                <span className="text-sm font-semibold text-[#EA580C]">
                  SAR {(svc.revenue / 1000).toFixed(0)}K
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${highlight ? "border-[#EA580C]/30 bg-orange-50" : "border-orange-100"}`}>
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
