import { AnalyticsDashboard } from "@/components/company/analytics/AnalyticsDashboard";
import { DEMO_ANALYTICS } from "@/lib/company/mock-data";

export default function CompanyAnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <AnalyticsDashboard data={DEMO_ANALYTICS} />
    </div>
  );
}
