"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { useAdminCapabilities } from "@/components/admin/useAdminCapabilities";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useTranslations } from "@/i18n/use-translations";
import { getAdminNavItems } from "@/lib/admin/admin-nav";
import { getUrgentDisputeCount } from "@/lib/admin/mock-data";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const { t } = useTranslations();
  const { isOwner, isLimitedAdmin, userEmail, userName, isLoading } = useAdminCapabilities();
  const urgentCount = getUrgentDisputeCount();
  const navItems = getAdminNavItems(isOwner);

  const suiteLabel = isOwner ? t("admin.superAdminSuite") : t("admin.limitedAdminSuite");
  const roleLabel = isOwner ? t("admin.platformOwner") : t("admin.limitedAdminRole");
  const privilegeBadge = isOwner ? t("admin.highPrivilege") : t("admin.limitedPrivilege");

  return (
    <div className="flex min-h-screen bg-[#0B1120]">
      <aside className="fixed inset-y-0 start-0 z-40 flex w-64 flex-col overflow-hidden border-e border-red-900/20 bg-[#0F172A]">
        <div className="border-b border-slate-800 p-5">
          <VoraLogo
            size="md"
            href="/admin"
            linkClassName="block transition-opacity hover:opacity-90"
          />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">{suiteLabel}</p>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain p-3">
          {navItems.map((item) => {
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
              {isOwner ? "👑" : "🛡️"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {userName || roleLabel}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {userEmail ?? (isLoading ? "…" : roleLabel)}
              </p>
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

      <div className="flex-1 ps-64">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B1120]/95 backdrop-blur">
          <div className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-4">
              <Link
                href="/network"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                <span aria-hidden>←</span>
                {t("admin.backToNetwork")}
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400">{t("admin.liveOperational")}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{t("common.currencySar")}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-bold",
                  isOwner
                    ? "bg-red-600/20 text-red-400"
                    : "bg-amber-600/20 text-amber-400"
                )}
              >
                {privilegeBadge}
              </span>
              {isLimitedAdmin && (
                <span className="hidden text-slate-500 md:inline">{t("admin.limitedAdminHint")}</span>
              )}
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
