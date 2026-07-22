"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarToggle } from "@/components/layout/SidebarToggle";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useSidebar } from "@/providers/SidebarProvider";
import { usePlatform } from "@/providers/PlatformProvider";
import { shouldShowGlobalSidebar } from "@/lib/navigation/validate";
import { cn } from "@/lib/utils";

function shouldShowGlobalFooter(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/auth")) return false;
  if (["/contact", "/about", "/terms", "/privacy"].includes(pathname)) return false;
  return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = shouldShowGlobalSidebar(pathname);
  const showFooter = shouldShowGlobalFooter(pathname);
  const { isOpen, toggle } = useSidebar();
  const { platform } = usePlatform();

  return (
    <div className="flex min-h-screen flex-col">
      {showSidebar && (
        <>
          <Sidebar />
          <SidebarToggle
            isOpen={isOpen}
            onToggle={toggle}
            variant={platform === "freelance" ? "freelance" : "network"}
          />
        </>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col transition-[padding-inline-start] duration-300 ease-in-out",
          showSidebar && isOpen && "lg:ps-64"
        )}
      >
        {children}
        {showFooter && <SiteFooter />}
      </div>
    </div>
  );
}
