import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { listCompaniesForAdminFromSupabase } from "@/lib/admin/admin-companies-supabase";
import type { ModerationCompany, ModerationService, ModerationStore } from "@/types/admin";

type ReportTargetType = "store" | "service" | "company";

interface ReportAggregate {
  count: number;
  lastReason?: string;
}

async function getReportAggregates(
  targetType: ReportTargetType,
  targetIds: string[]
): Promise<Map<string, ReportAggregate>> {
  const aggregates = new Map<string, ReportAggregate>();
  if (targetIds.length === 0) return aggregates;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_reports")
    .select("target_id, reason, created_at")
    .eq("target_type", targetType)
    .in("target_id", targetIds)
    .in("status", ["pending", "reviewing"])
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return aggregates;
    throw error;
  }

  for (const row of data ?? []) {
    const targetId = String(row.target_id);
    const existing = aggregates.get(targetId);
    if (existing) {
      existing.count += 1;
    } else {
      aggregates.set(targetId, {
        count: 1,
        lastReason: row.reason as string,
      });
    }
  }

  return aggregates;
}

export async function listStoresForModerationFromSupabase(): Promise<ModerationStore[]> {
  const admin = createAdminClient();

  const [storesRes, servicesRes, accountsRes] = await Promise.all([
    admin
      .from("freelancer_stores")
      .select("id, store_name, account_id, is_active, rating_avg")
      .order("store_name"),
    admin.from("freelance_services").select("store_id"),
    admin.from("accounts").select("id, full_name, email"),
  ]);

  if (storesRes.error) throw storesRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (accountsRes.error) throw accountsRes.error;

  const serviceCounts = new Map<string, number>();
  for (const row of servicesRes.data ?? []) {
    const storeId = row.store_id as string;
    serviceCounts.set(storeId, (serviceCounts.get(storeId) ?? 0) + 1);
  }

  const accountNames = new Map<string, string>();
  for (const row of accountsRes.data ?? []) {
    const name = (row.full_name as string | null)?.trim();
    accountNames.set(
      row.id as string,
      name || (row.email as string)?.split("@")[0] || "Owner"
    );
  }

  const storeIds = (storesRes.data ?? []).map((row) => row.id as string);
  const reports = await getReportAggregates("store", storeIds);

  return (storesRes.data ?? []).map((row) => {
    const id = row.id as string;
    const report = reports.get(id);
    return {
      id,
      storeName: row.store_name as string,
      ownerName: accountNames.get(row.account_id as string) ?? "Owner",
      servicesCount: serviceCounts.get(id) ?? 0,
      rating: Number(row.rating_avg ?? 0),
      isHidden: row.is_active === false,
      reportCount: report?.count ?? 0,
      lastReportReason: report?.lastReason,
    };
  });
}

export async function listServicesForModerationFromSupabase(): Promise<ModerationService[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("freelance_services")
    .select("id, title, price, category, status, freelancer_stores(store_name)")
    .order("title");

  if (error) throw error;

  const serviceIds = (data ?? []).map((row) => row.id as string);
  const reports = await getReportAggregates("service", serviceIds);

  return (data ?? []).map((row) => {
    const id = row.id as string;
    const store = row.freelancer_stores as { store_name?: string } | null;
    const report = reports.get(id);
    return {
      id,
      title: row.title as string,
      storeName: store?.store_name ?? "Store",
      price: Number(row.price),
      category: (row.category as string | null) ?? "General",
      isHidden: row.status !== "active",
      reportCount: report?.count ?? 0,
    };
  });
}

export async function listCompaniesForModerationFromSupabase(): Promise<ModerationCompany[]> {
  const companies = await listCompaniesForAdminFromSupabase();
  const companyIds = companies.map((company) => company.id);
  const reports = await getReportAggregates("company", companyIds);

  return companies.map((company) => ({
    ...company,
    reportCount: reports.get(company.id)?.count ?? company.reportCount,
  }));
}

export async function setStoreHiddenInSupabase(
  storeId: string,
  isHidden: boolean
): Promise<ModerationStore | null> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("freelancer_stores")
    .update({ is_active: !isHidden, updated_at: new Date().toISOString() })
    .eq("id", storeId);

  if (error) throw error;

  const stores = await listStoresForModerationFromSupabase();
  return stores.find((store) => store.id === storeId) ?? null;
}

export async function setServiceHiddenInSupabase(
  serviceId: string,
  isHidden: boolean
): Promise<ModerationService | null> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("freelance_services")
    .update({
      status: isHidden ? "paused" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (error) throw error;

  const services = await listServicesForModerationFromSupabase();
  return services.find((service) => service.id === serviceId) ?? null;
}

export async function archiveServiceInSupabase(serviceId: string): Promise<ModerationService | null> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("freelance_services")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (error) throw error;

  const services = await listServicesForModerationFromSupabase();
  return services.find((service) => service.id === serviceId) ?? null;
}

export async function archiveStoreInSupabase(storeId: string): Promise<ModerationStore | null> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("freelancer_stores")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", storeId);

  if (error) throw error;

  const stores = await listStoresForModerationFromSupabase();
  return stores.find((store) => store.id === storeId) ?? null;
}
