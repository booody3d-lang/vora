import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_PLATFORM_OVERVIEW } from "@/lib/admin/mock-data";
import type { PlatformOverview } from "@/types/admin";

const ACTIVE_ESCROW_STATUSES = [
  "paid",
  "awaiting_requirements",
  "in_progress",
  "delivered",
  "revision_requested",
  "disputed",
] as const;

function metric(value: number, label: string): PlatformOverview["totalUsers"] {
  return { value, growthPercent: 0, label };
}

export async function getAdminPlatformOverviewFromSupabase(): Promise<PlatformOverview> {
  const admin = createAdminClient();
  const labels = ADMIN_PLATFORM_OVERVIEW;

  const [accountsRes, companiesRes, activeJobsRes, storesRes, servicesRes, escrowOrdersRes] =
    await Promise.all([
      admin.from("accounts").select("tier, professional_unlocked"),
      admin.from("companies").select("id", { count: "exact", head: true }),
      admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("freelancer_stores").select("id", { count: "exact", head: true }),
      admin.from("freelance_services").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin
        .from("freelance_orders")
        .select("id", { count: "exact", head: true })
        .in("status", [...ACTIVE_ESCROW_STATUSES])
        .eq("escrow_released", false),
    ]);

  if (accountsRes.error) throw accountsRes.error;
  if (companiesRes.error) throw companiesRes.error;
  if (activeJobsRes.error) throw activeJobsRes.error;
  if (storesRes.error) throw storesRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (escrowOrdersRes.error) throw escrowOrdersRes.error;

  const accounts = accountsRes.data ?? [];
  const professionalUsers = accounts.filter(
    (row) => row.tier === "professional" || row.professional_unlocked === true
  ).length;
  const basicUsers = accounts.length - professionalUsers;

  return {
    totalUsers: metric(accounts.length, labels.totalUsers.label),
    basicUsers,
    professionalUsers,
    totalCompanies: metric(companiesRes.count ?? 0, labels.totalCompanies.label),
    activeJobVacancies: metric(activeJobsRes.count ?? 0, labels.activeJobVacancies.label),
    totalStores: metric(storesRes.count ?? 0, labels.totalStores.label),
    publishedServices: metric(servicesRes.count ?? 0, labels.publishedServices.label),
    activeEscrowOrders: metric(escrowOrdersRes.count ?? 0, labels.activeEscrowOrders.label),
  };
}
