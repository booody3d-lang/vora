import { AnalyticsDashboard } from "@/components/company/analytics/AnalyticsDashboard";
import { getAnalyticsForAccount } from "@/lib/company/analytics-store";
import { forbidCompanyAnalytics } from "@/lib/security/feature-guard";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound, redirect } from "next/navigation";

export default async function CompanyAnalyticsPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) notFound();

  const denied = await forbidCompanyAnalytics(auth.user);
  if (denied) redirect("/billing/plans");

  const { analytics, source } = await getAnalyticsForAccount(auth.user.id);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {source !== "supabase" && source !== "json" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Showing sample analytics until your company has live recruitment activity.
        </p>
      )}
      <AnalyticsDashboard data={analytics} />
    </div>
  );
}
