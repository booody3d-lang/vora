"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { DualDashboardToggle } from "@/components/navigation/DualDashboardToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { href: "/network", labelKey: "nav.home", icon: "🏠" },
  { href: "/network/profile/alex-morgan", labelKey: "nav.profile", icon: "👤" },
  { href: "/network/messages", labelKey: "nav.messaging", icon: "💬" },
  { href: "/network/jobs", labelKey: "nav.jobs", icon: "💼" },
  { href: "/network/ai", labelKey: "nav.voraAi", icon: "✨" },
] as const;

export function NetworkNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-6">
          <VoraLogo variant="light" showWordmark={false} href="/network" />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_KEYS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/network" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        <DualDashboardToggle />
        <div className="flex items-center gap-3">
          <LocaleSwitcher variant="light" />
          <NotificationBell variant="light" />
          <Link
            href="/network/messages"
            className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={t("nav.messagesAria")}
          >
            💬
          </Link>
          <Link href="/network/profile/alex-morgan">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
              alt={t("nav.yourProfile")}
              className="h-8 w-8 rounded-full border-2 border-[#3B5998]"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
