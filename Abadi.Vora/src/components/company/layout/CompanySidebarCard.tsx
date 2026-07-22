"use client";

import Link from "next/link";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface CompanySidebarCardProps {
  onNavigate?: () => void;
}

export function CompanySidebarCard({ onNavigate }: CompanySidebarCardProps) {
  const { t } = useTranslations();
  const { company, companySlug, loading } = useCurrentCompany();

  if (loading || !company || !companySlug) return null;

  const coverStyle = company.coverImageUrl
    ? { backgroundImage: `url(${company.coverImageUrl})` }
    : { background: "linear-gradient(135deg, #0F172A 0%, #3B5998 100%)" };

  return (
    <Link
      href={`/network/company/${companySlug}`}
      onClick={onNavigate}
      className="mx-3 mb-2 block overflow-hidden rounded-xl bg-slate-800/60 transition-colors hover:bg-slate-800"
      aria-label={t("company.nav.publicPage")}
    >
      <div className="h-14 w-full bg-cover bg-center" style={coverStyle} />
      <div className="flex items-center gap-3 px-3 py-2.5">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            className="-mt-7 h-10 w-10 shrink-0 rounded-lg border-2 border-white bg-white object-cover shadow-sm"
          />
        ) : (
          <div className="-mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-slate-700 text-lg">
            🏢
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{company.name}</p>
          {company.tagline && (
            <p className="truncate text-[10px] text-slate-400">{company.tagline}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
