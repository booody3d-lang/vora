"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/providers/LocaleProvider";

interface CompanyPublicNavProps {
  companyName: string;
  companySlug: string;
}

export function CompanyPublicNav({ companyName, companySlug }: CompanyPublicNavProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const isPublicPage = pathname.startsWith(`/network/company/${companySlug}`);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <VoraLogo size="sm" href="/network" />
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold text-white">{companyName}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t("company.page.companyPage")}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href={`/network/company/${companySlug}`}
            className={`text-xs font-medium transition-colors ${
              isPublicPage ? "text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t("company.nav.publicPage")}
          </Link>
          <Link
            href="/company/dashboard"
            className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            {t("company.nav.portal")}
          </Link>
          <LocaleSwitcher variant="light" />
        </nav>
      </div>
    </header>
  );
}
