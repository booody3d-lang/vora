"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SidebarProfileCard } from "@/components/layout/SidebarProfileCard";
import { useSidebar } from "@/providers/SidebarProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { usePermissions } from "@/providers/VoraProviders";
import { cn } from "@/lib/utils";
import type { SidebarMode } from "@/types/navigation";

const MODE_STYLES: Record<
  SidebarMode,
  {
    aside: string;
    brand: string;
    brandAccent: string;
    subtitle: string;
    active: string;
    inactive: string;
    footer: string;
    toggleActive: string;
    toggleInactive: string;
    logoVariant: "light" | "default";
    localeVariant: "light" | "dark";
  }
> = {
  network: {
    aside: "border-slate-800 bg-[#0F172A]",
    brand: "text-white",
    brandAccent: "text-[#3B5998]",
    subtitle: "text-slate-500",
    active: "bg-[#3B5998]/20 text-[#93C5FD]",
    inactive: "text-slate-400 hover:bg-slate-800 hover:text-white",
    footer: "border-slate-800",
    toggleActive: "bg-[#3B5998] text-white shadow-lg",
    toggleInactive: "text-slate-400 hover:text-white",
    logoVariant: "light",
    localeVariant: "light",
  },
  freelance: {
    aside: "border-[#EA580C]/15 bg-white",
    brand: "text-[#0F172A]",
    brandAccent: "text-[#EA580C]",
    subtitle: "text-slate-400",
    active: "bg-[#EA580C]/10 text-[#EA580C]",
    inactive: "text-slate-600 hover:bg-orange-50 hover:text-[#EA580C]",
    footer: "border-orange-100",
    toggleActive: "bg-[#EA580C] text-white shadow-lg",
    toggleInactive: "text-slate-500 hover:text-[#EA580C]",
    logoVariant: "default",
    localeVariant: "dark",
  },
};

function resolveLabel(
  link: { labelKey: string | null; labelEn: string; labelAr: string },
  t: (key: string) => string,
  locale: string
): string {
  if (link.labelKey) {
    const translated = t(link.labelKey);
    if (translated !== link.labelKey) return translated;
  }
  return locale === "ar" ? link.labelAr : link.labelEn;
}

export function Sidebar() {
  const pathname = usePathname();
  const { mode, setMode, links, isLoading, error, isOpen, setOpen } = useSidebar();
  const { t, locale, dir } = useLocale();
  const { refreshSession } = usePermissions();
  const styles = MODE_STYLES[mode];
  const isRtl = dir === "rtl";

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    try {
      await refreshSession();
    } catch {
      // redirect will reload auth state
    }
    window.location.assign("/auth/login");
  }

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
          "fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e transition-transform duration-300 ease-in-out",
          isOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full"
              : "-translate-x-full",
          styles.aside
        )}
        data-sidebar-mode={mode}
        aria-label={t("sidebar.navigation")}
        aria-hidden={!isOpen}
      >
        <div className={cn("border-b p-5", styles.footer)}>
          <VoraLogo
            size="lg"
            href={mode === "network" ? "/network" : "/freelance"}
            linkClassName="block transition-opacity hover:opacity-90"
          />
          <p className={cn("mt-1 text-[10px] uppercase tracking-widest", styles.subtitle)}>
            {mode === "network" ? t("sidebar.networkPlatform") : t("sidebar.freelancePlatform")}
          </p>
        </div>

        <div className="px-3 pt-3">
          <div
            className={cn(
              "flex rounded-full p-1",
              mode === "network" ? "bg-slate-800/80" : "bg-orange-50"
            )}
            role="tablist"
            aria-label={t("common.platformSwitcher")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "network"}
              onClick={() => setMode("network")}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                mode === "network" ? styles.toggleActive : styles.toggleInactive
              )}
            >
              {t("common.network")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "freelance"}
              onClick={() => setMode("freelance")}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                mode === "freelance" ? styles.toggleActive : styles.toggleInactive
              )}
            >
              {t("common.freelance")}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className={cn(
                  "h-10 animate-pulse rounded-xl",
                  mode === "network" ? "bg-slate-800" : "bg-orange-50"
                )}
              />
            ))}

          {!isLoading && error && (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          {!isLoading &&
            links.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/network" &&
                  item.href !== "/freelance" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? styles.active : styles.inactive
                  )}
                >
                  <span className="text-base opacity-80">{item.icon}</span>
                  {resolveLabel(item, t, locale)}
                </Link>
              );
            })}
        </nav>

        <SidebarProfileCard
          mode={mode}
          onNavigate={() => {
            if (window.innerWidth < 1024) setOpen(false);
          }}
        />

        <div className={cn("border-t p-4", styles.footer)}>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={cn(
              "mb-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              styles.inactive
            )}
          >
            <span className="text-base opacity-80">🚪</span>
            {t("common.signOut")}
          </button>
          <LocaleSwitcher variant={styles.localeVariant} />
        </div>
      </aside>
    </>
  );
}
