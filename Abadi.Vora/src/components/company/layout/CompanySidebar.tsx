"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { CompanySidebarCard } from "@/components/company/layout/CompanySidebarCard";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useCompanySidebar } from "@/providers/CompanySidebarProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/company/dashboard", labelKey: "company.nav.overview", icon: "📊", exact: true },
  { href: "/company/dashboard/settings", labelKey: "company.nav.companyPage", icon: "🏢" },
  { href: "/company/dashboard/jobs", labelKey: "company.nav.jobs", icon: "💼" },
  { href: "/company/dashboard/jobs/new", labelKey: "company.nav.postJob", icon: "➕" },
  { href: "/company/dashboard/analytics", labelKey: "company.nav.analytics", icon: "📈" },
] as const;

export function CompanySidebar() {
  const pathname = usePathname();
  const { isOpen, setOpen } = useCompanySidebar();
  const { t, dir } = useLocale();
  const { companySlug } = useCurrentCompany();
  const isRtl = dir === "rtl";
  const publicPageHref = companySlug
    ? `/network/company/${companySlug}`
    : "/network/company/techcorp-global";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label={t("sidebar.close")}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-slate-800 bg-[#0F172A] transition-transform duration-300 ease-in-out",
          isOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full"
              : "-translate-x-full"
        )}
        aria-label={t("company.nav.portal")}
        aria-hidden={!isOpen}
      >
        <div className="border-b border-slate-800 p-5">
          <VoraLogo
            size="lg"
            href="/company/dashboard"
            linkClassName="block transition-opacity hover:opacity-90"
          />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
            {t("company.nav.portal")}
          </p>
        </div>

        <CompanySidebarCard
          onNavigate={() => {
            if (window.innerWidth < 1024) setOpen(false);
          }}
        />

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (!("exact" in item && item.exact) && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#3B5998]/20 text-[#93C5FD]"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span className="text-base opacity-80">{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            );
          })}

          <div className="my-3 border-t border-slate-800" />

          <Link
            href={publicPageHref}
            onClick={() => {
              if (window.innerWidth < 1024) setOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <span className="text-base opacity-80">🌐</span>
            {t("company.nav.publicPage")}
          </Link>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <LocaleSwitcher variant="light" />
        </div>
      </aside>
    </>
  );
}
