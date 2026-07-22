"use client";

import Link from "next/link";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useLocale } from "@/providers/LocaleProvider";

export function CompanyDashboardNav() {
  const { t } = useLocale();
  const { company, companySlug } = useCurrentCompany();
  const publicPageHref = companySlug
    ? `/network/company/${companySlug}`
    : "/network/company/techcorp-global";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-700/50 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <VoraLogo size="sm" href="/company/dashboard" />
          <span className="hidden rounded-full bg-[#3B5998]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#93C5FD] md:inline">
            {t("company.nav.portal")}
          </span>
          {company && (
            <span className="hidden truncate text-sm font-medium text-white lg:inline">
              {company.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/company/dashboard/settings"
            className="text-xs font-medium text-slate-400 hover:text-white"
          >
            {t("company.nav.companyPage")}
          </Link>
          <Link
            href={publicPageHref}
            className="text-xs font-medium text-slate-400 hover:text-white"
          >
            {t("company.nav.publicPage")}
          </Link>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-8 w-8 rounded-lg border border-slate-600 bg-white object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-sm">
              🏢
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
