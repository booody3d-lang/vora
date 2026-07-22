import { CompanyDashboardNav } from "@/components/company/layout/CompanyDashboardNav";
import { CompanyShell } from "@/components/company/layout/CompanyShell";
import { CompanySubscriptionBannerLoader } from "@/components/company/layout/CompanySubscriptionBannerLoader";
import { CompanySidebarProvider } from "@/providers/CompanySidebarProvider";

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
          <CompanySubscriptionBannerLoader />
          {children}
        </div>
      </CompanyShell>
    </CompanySidebarProvider>
  );
}
