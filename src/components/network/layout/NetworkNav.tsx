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
import { useTranslations } from "@/i18n/use-translations";
import { getCurrentUserProfileUrl } from "@/lib/network/urls";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { href: "/network", labelKey: "nav.home", icon: "🏠", matchPrefix: false },
  { href: "/network/messages", labelKey: "nav.messaging", icon: "💬", matchPrefix: true },
  { href: "/network/jobs", labelKey: "nav.jobs", icon: "💼", matchPrefix: true },
  { href: "/network/ai", labelKey: "nav.voraAi", icon: "✨", matchPrefix: true },
] as const;

export function NetworkNav() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { profileSlug, avatarUrl, gender, profile, fullName, profilePhotoUrl, subscriptionBadge } =
    useCurrentProfile();
  const profileHref = profileSlug ? getCurrentUserProfileUrl() : getCurrentUserProfileUrl();

  const navItems = [
    NAV_KEYS[0],
    { href: profileHref, labelKey: "nav.profile" as const, icon: "👤", matchPrefix: true },
    ...NAV_KEYS.slice(1),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-4 md:gap-6">
          <VoraLogo size="sm" href="/network" />
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const href = item.href;
              const active =
                pathname === href ||
                (item.matchPrefix && href !== "/network" && pathname.startsWith(href));
              return (
                <Link
                  key={item.labelKey}
                  href={href}
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
