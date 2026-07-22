import { NextResponse } from "next/server";
import {
  getAdminCompanyOverview,
  isAdminCompaniesPersistenceActive,
  listCompaniesForAdmin,
  listJobsForAdmin,
} from "@/lib/admin/admin-companies-store";
import { getAuthenticatedUser, requireActivityMonitoring } from "@/lib/security/session";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth || !requireActivityMonitoring(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [overview, companies, jobs] = await Promise.all([
    getAdminCompanyOverview(),
    listCompaniesForAdmin(),
    listJobsForAdmin(),
  ]);

  return NextResponse.json({
    overview,
    companies,
    jobs,
    persistence: isAdminCompaniesPersistenceActive() ? "supabase" : "demo",
  });
}
