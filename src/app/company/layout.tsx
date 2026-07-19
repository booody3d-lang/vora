import { CompanyDashboardNav } from "@/components/company/layout/CompanyDashboardNav";
import { CompanyShell } from "@/components/company/layout/CompanyShell";
import { SubscriptionBanner } from "@/components/company/layout/SubscriptionBanner";
import { CompanySidebarProvider } from "@/providers/CompanySidebarProvider";
import { DEMO_SUBSCRIPTION } from "@/lib/company/mock-data";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanySidebarProvider>
      <CompanyShell>
        <div className="min-h-screen bg-[#F1F5F9]" data-platform="network">
          <CompanyDashboardNav />
          <SubscriptionBanner subscription={DEMO_SUBSCRIPTION} />
          {children}
        </div>
      </CompanyShell>
    </CompanySidebarProvider>
  );
}
