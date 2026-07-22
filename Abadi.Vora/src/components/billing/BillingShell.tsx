"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/billing/wallet", labelKey: "billing.nav.wallet" },
  { href: "/billing/plans", labelKey: "billing.nav.plans" },
  { href: "/billing/invoices", labelKey: "billing.nav.invoices" },
  { href: "/billing/withdraw", labelKey: "billing.nav.withdraw" },
] as const;

export function BillingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-lg font-bold text-[#0F172A]">
              VORA <span className="text-[#EA580C]">{t("billing.nav.billingLabel")}</span>
            </Link>
            <p className="text-xs text-slate-400">{t("billing.nav.subtitle")}</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[#EA580C]/10 text-[#EA580C]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#EA580C]"
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
