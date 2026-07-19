"use client";

import { CompanySidebar } from "@/components/company/layout/CompanySidebar";
import { SidebarToggle } from "@/components/layout/SidebarToggle";
import { useCompanySidebar } from "@/providers/CompanySidebarProvider";
import { cn } from "@/lib/utils";

export function CompanyShell({ children }: { children: React.ReactNode }) {
  const { isOpen, toggle } = useCompanySidebar();

  return (
    <div className="flex min-h-screen flex-col">
      <CompanySidebar />
      <SidebarToggle isOpen={isOpen} onToggle={toggle} variant="company" />
      <div
        className={cn(
          "flex flex-1 flex-col transition-[padding-inline-start] duration-300 ease-in-out",
          isOpen && "lg:ps-64"
        )}
      >
        {children}
      </div>
    </div>
  );
}
