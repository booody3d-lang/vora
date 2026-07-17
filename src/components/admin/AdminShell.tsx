"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useTranslations } from "@/i18n/use-translations";
import { getUrgentDisputeCount } from "@/lib/admin/mock-data";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { href: "/admin", labelKey: "admin.nav.commandCenter", icon: "⬡" },
  { href: "/admin/finance", labelKey: "admin.nav.financialSuite", icon: "◈" },
  { href: "/admin/users", labelKey: "admin.nav.userManagement", icon: "◎" },
  { href: "/admin/verification", labelKey: "admin.nav.verificationDesk", icon: "✓" },
  { href: "/admin/moderation", labelKey: "admin.nav.moderation", icon: "⚑" },
  { href: "/admin/disputes", labelKey: "admin.nav.disputeHub", icon: "⚠", badge: true },
  { href: "/admin/security", labelKey: "admin.nav.securityAudit", icon: "⛨" },
  { href: "/admin/analytics", labelKey: "admin.nav.analytics", icon: "◉" },
  { href: "/admin/ai", labelKey: "admin.nav.predictiveAi", icon: "✨" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const { t } = useTranslations();
  const urgentCount = getUrgentDisputeCount();

  return (
    <div className="flex min-h-screen bg-[#0B1120]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-red-900/20 bg-[#0F172A]">
        <div className="border-b border-slate-800 p-5">
          <Link href="/admin" className="block">
            <span className="text-lg font-bold text-white">VORA</span>
            <span className="ml-1 text-lg font-bold text-red-500">{t("admin.ownerBrand")}</span>
          </Link>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
            {t("admin.superAdminSuite")}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_KEYS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-red-600/20 text-red-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base opacity-70">{item.icon}</span>
                  {t(item.labelKey)}
                </span>
                {"badge" in item && item.badge && urgentCount > 0 && (
                  <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {urgentCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3">
            <LocaleSwitcher variant="light" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 text-sm">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{t("admin.platformOwner")}</p>
              <p className="text-[10px] text-slate-500">{t("admin.superAdminRole")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-700 py-1.5 text-xs text-slate-400 hover:border-red-800 hover:text-red-400"
          >
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B1120]/95 backdrop-blur">
          <div className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-400">{t("admin.liveOperational")}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{t("common.currencySar")}</span>
              <span className="rounded-full bg-red-600/20 px-2 py-0.5 font-bold text-red-400">
                {t("admin.highPrivilege")}
              </span>
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
