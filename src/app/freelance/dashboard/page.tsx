import { SellerDashboard } from "@/components/freelance/dashboard/SellerDashboard";
import { ServiceOptimizationWizard } from "@/components/ai/freelance/ServiceOptimizationWizard";
import { DEMO_SELLER_ANALYTICS, DEMO_STORE } from "@/lib/freelance/mock-data";

export default function FreelanceDashboardPage() {
  return (
    <div className="space-y-6">
      <SellerDashboard analytics={DEMO_SELLER_ANALYTICS} storeName={DEMO_STORE.storeName} />
      <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <ServiceOptimizationWizard />
      </div>
    </div>
  );
}
