"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { usePublicPageHref } from "@/hooks/use-public-page-href";
import { useTranslations } from "@/i18n/use-translations";
import { getCompanyUrl } from "@/lib/network/urls";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";
import type { SidebarMode } from "@/types/navigation";

interface SidebarProfileCardProps {
  mode: SidebarMode;
  onNavigate?: () => void;
}

export function SidebarProfileCard({ mode, onNavigate }: SidebarProfileCardProps) {
  const { t } = useTranslations();
  const { role } = usePermissions();
  const {
    fullName,
    avatarUrl,
    profilePhotoUrl,
    coverImageUrl,
    gender,
    loading: profileLoading,
    subscriptionBadge,
  } = useCurrentProfile();
  const { company, companySlug, loading: companyLoading } = useCurrentCompany();
  const publicPageHref = usePublicPageHref();

  if (role === "company") {
    if (companyLoading || !company || !companySlug) return null;

    const coverSrc =
      company.coverImageUrl ||
      "linear-gradient(135deg, #0F172A 0%, #3B5998 100%)";

    return (
      <Link
        href={getCompanyUrl(companySlug)}
        onClick={onNavigate}
        className={cn(
          "mx-3 mb-2 block overflow-hidden rounded-xl transition-colors",
          mode === "network"
            ? "bg-slate-800/60 hover:bg-slate-800"
            : "bg-orange-50 hover:bg-orange-100/80"
        )}
        aria-label={t("company.nav.companyPage")}
      >
        <div
          className="h-14 w-full bg-cover bg-center"
          style={
            company.coverImageUrl
              ? { backgroundImage: `url(${coverSrc})` }
              : { background: coverSrc }
          }
        />
        <div className="flex items-center gap-3 px-3 py-2.5">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="-mt-7 h-10 w-10 shrink-0 rounded-lg border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="-mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-slate-100 text-lg shadow-sm">
              🏢
            </div>
          )}
          <span
            className={cn(
              "truncate text-sm font-medium",
              mode === "network" ? "text-white" : "text-[#0F172A]"
            )}
          >
            {company.name}
          </span>
        </div>
      </Link>
    );
  }

  if (profileLoading || !fullName || !publicPageHref) return null;

  const coverSrc =
    coverImageUrl ||
    "linear-gradient(135deg, #0F172A 0%, #3B5998 100%)";

  return (
    <Link
      href={publicPageHref}
      onClick={onNavigate}
      className={cn(
        "mx-3 mb-2 block overflow-hidden rounded-xl transition-colors",
        mode === "network"
          ? "bg-slate-800/60 hover:bg-slate-800"
          : "bg-orange-50 hover:bg-orange-100/80"
      )}
      aria-label={t("sidebar.viewProfile", { name: fullName })}
    >
      <div
        className="h-14 w-full bg-cover bg-center"
        style={
          coverImageUrl
            ? { backgroundImage: `url(${coverSrc})` }
            : { background: coverSrc }
        }
      />
      <div className="flex items-center gap-3 px-3 py-2.5">
        <UserAvatar
          photoUrl={profilePhotoUrl || avatarUrl}
          gender={gender}
          name={fullName}
          tierBadge={subscriptionBadge}
          className="-mt-7 h-10 w-10 shrink-0 border-2 border-white shadow-sm"
        />
        <span
          className={cn(
            "truncate text-sm font-medium",
            mode === "network" ? "text-white" : "text-[#0F172A]"
          )}
        >
          {fullName}
        </span>
      </div>
    </Link>
  );
}
