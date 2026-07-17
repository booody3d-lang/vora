"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/company/dashboard", label: "Overview", icon: "📊" },
  { href: "/company/dashboard/jobs", label: "Jobs", icon: "💼" },
  { href: "/company/dashboard/analytics", label: "Analytics", icon: "📈" },
];

export function CompanyDashboardNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/50 bg-[#0F172A] shadow-lg">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-6">
          <VoraLogo variant="light" showWordmark href="/company/dashboard" />
          <span className="hidden rounded-full bg-[#3B5998]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#93C5FD] md:inline">
            Company Portal
          </span>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/company/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/network/company/techcorp-global"
            className="text-xs font-medium text-slate-400 hover:text-white"
          >
            View Public Page
          </Link>
          <img
            src="https://api.dicebear.com/7.x/identicon/svg?seed=TechCorp"
            alt=""
            className="h-8 w-8 rounded-lg border border-slate-600"
          />
        </div>
      </div>
    </header>
  );
}
