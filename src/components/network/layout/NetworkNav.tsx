"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { DualDashboardToggle } from "@/components/navigation/DualDashboardToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { usePublicPageHref } from "@/hooks/use-public-page-href";
import { useTranslations } from "@/i18n/use-translations";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";

const PROFESSIONAL_NAV_KEYS = [
  { href: "/network", labelKey: "nav.home", icon: "🏠", matchPrefix: false },
  { href: "/network/messages", labelKey: "nav.messaging", icon: "💬", matchPrefix: true },
  { href: "/network/jobs", labelKey: "nav.jobs", icon: "💼", matchPrefix: true },
  { href: "/network/ai", labelKey: "nav.voraAi", icon: "✨", matchPrefix: true },
] as const;

const COMPANY_NAV_KEYS = [
  { href: "/company/dashboard", labelKey: "company.nav.portal", icon: "🏠", matchPrefix: false },
  { href: "/network/messages", labelKey: "nav.messaging", icon: "💬", matchPrefix: true },
  { href: "/company/dashboard/jobs", labelKey: "company.nav.jobs", icon: "💼", matchPrefix: true },
] as const;

type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
  matchPrefix: boolean;
};

export function NetworkNav() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { role } = usePermissions();
  const { avatarUrl, gender, profile, fullName, profilePhotoUrl, subscriptionBadge } =
    useCurrentProfile();
  const profileHref = usePublicPageHref();
  const isCompany = role === "company";
  const isOwner = role === "owner";
  const isAdminUser = role === "admin" || isOwner;

  const baseNavKeys = isCompany ? COMPANY_NAV_KEYS : PROFESSIONAL_NAV_KEYS;

  const navItems: NavItem[] = [
    baseNavKeys[0],
    {
      href: profileHref,
      labelKey: isCompany ? "company.nav.companyPage" : "nav.profile",
      icon: isCompany ? "🏢" : "👤",
      matchPrefix: true,
    },
    ...baseNavKeys.slice(1),
  ];

  if (isAdminUser) {
    navItems.push({
      href: "/admin",
      labelKey: isOwner ? "nav.ownerPanel" : "nav.adminPanel",
      icon: isOwner ? "👑" : "🛡️",
      matchPrefix: true,
    });
  }

  const logoHref = isCompany ? "/company/dashboard" : "/network";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-4 md:gap-6">
          <VoraLogo size="sm" href={logoHref} />
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const href = item.href;
              const active =
                pathname === href ||
                ((item.labelKey === "nav.profile" || item.labelKey === "company.nav.companyPage") &&
                  (pathname.startsWith("/network/profile/") ||
                    pathname.startsWith("/network/company/") ||
                    pathname === "/profile/me")) ||
                (item.labelKey === "company.nav.portal" && pathname === "/company/dashboard") ||
                (item.labelKey === "company.nav.jobs" && pathname.startsWith("/company/dashboard/jobs")) ||
                ((item.labelKey === "nav.ownerPanel" || item.labelKey === "nav.adminPanel") &&
                  pathname.startsWith("/admin")) ||
                (item.matchPrefix && href !== "/network" && href !== "/company/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={item.labelKey}
                  href={href}
                  prefetch={item.labelKey === "nav.adminPanel" || item.labelKey === "nav.ownerPanel" ? false : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                    active ? "text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden min-w-0 flex-1 md:block md:max-w-xl lg:max-w-2xl">
          <GlobalSearchBar variant="nav" />
        </div>

        <DualDashboardToggle />
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {isAdminUser && (
            <Link
              href="/admin"
              prefetch={false}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors md:hidden",
                pathname.startsWith("/admin")
                  ? "bg-red-600/30 text-red-300"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
              aria-label={t(isOwner ? "nav.ownerPanel" : "nav.adminPanel")}
            >
              <span className="text-base leading-none">{isOwner ? "👑" : "🛡️"}</span>
              <span className="max-w-[4.5rem] truncate">{t(isOwner ? "nav.ownerPanel" : "nav.adminPanel")}</span>
            </Link>
          )}
          <LocaleSwitcher variant="light" />
          <NotificationBell variant="light" />
          <Link
            href="/network/messages"
            className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={t("nav.messagesAria")}
          >
            💬
          </Link>
          <Link href={profileHref}>
            <UserAvatar
              photoUrl={profilePhotoUrl || profile?.profilePhotoUrl || avatarUrl}
              gender={profile?.gender ?? gender}
              name={fullName || profile?.fullName}
              tierBadge={subscriptionBadge}
              className="h-8 w-8 border-2 border-[#3B5998]"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
