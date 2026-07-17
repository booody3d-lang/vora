import { CompanyDashboardNav } from "@/components/company/layout/CompanyDashboardNav";
import { SubscriptionBanner } from "@/components/company/layout/SubscriptionBanner";
import { DEMO_SUBSCRIPTION } from "@/lib/company/mock-data";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F5F9]" data-platform="network">
      <CompanyDashboardNav />
      <SubscriptionBanner subscription={DEMO_SUBSCRIPTION} />
      {children}
    </div>
  );
}
