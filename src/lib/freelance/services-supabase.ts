import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { slugifyName, uniqueSlug } from "@/lib/profile/slugify";
import type {
  FreelancerStore,
  MarketplaceService,
  ServiceAddon,
  ServiceCategory,
  ServiceFaq,
} from "@/types/freelance";

type ServiceStatus = "draft" | "active" | "paused" | "archived";

interface DbServiceRow {
  id: string;
  store_id: string;
  slug: string;
  title: string;
  description: string;
  short_description: string | null;
  price: number;
  delivery_days: number;
  thumbnail_url: string | null;
  status: ServiceStatus;
  category: string | null;
  gallery_urls: string[] | null;
  video_url: string | null;
  faq: unknown;
  revisions_included: number;
  sales_count: number;
  is_featured: boolean;
  is_sponsored: boolean;
  is_new: boolean;
  rating_avg: number | null;
  review_count: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbAddonRow {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  price: number;
  extra_days: number;
}

interface StoreContext {
  id: string;
  slug: string;
  storeName: string;
  logoUrl?: string;
}

function parseFaq(value: unknown): ServiceFaq[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ServiceFaq =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ServiceFaq).question === "string" &&
      typeof (item as ServiceFaq).answer === "string"
  );
}

function mapAddonRow(row: DbAddonRow): ServiceAddon {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    price: Number(row.price),
    extraDays: row.extra_days,
  };
}

export function mapServiceRow(
  row: DbServiceRow,
  store: StoreContext,
  addons: ServiceAddon[] = []
): MarketplaceService {
  return {
    id: row.id,
    slug: row.slug,
    storeId: store.id,
    storeSlug: store.slug,
    storeName: store.storeName,
    sellerAvatar: store.logoUrl ?? "",
    title: row.title,
    shortDescription: row.short_description ?? "",
    category: (row.category as ServiceCategory) ?? "design",
    thumbnailUrl: row.thumbnail_url ?? "",
    galleryUrls: row.gallery_urls ?? [],
    videoUrl: row.video_url ?? undefined,
    price: row.price != null ? Number(row.price) : null,
    deliveryDays: row.delivery_days,
    revisionsIncluded: row.revisions_included,
    rating: Number(row.rating_avg ?? 0),
    reviewCount: row.review_count ?? 0,
    salesCount: row.sales_count ?? 0,
    isFeatured: row.is_featured,
    isSponsored: row.is_sponsored,
    isNew: row.is_new,
    description: row.description,
    faq: parseFaq(row.faq),
    addons,
  };
}

function mapServiceToRow(storeId: string, service: MarketplaceService): Record<string, unknown> {
  const status: ServiceStatus =
    service.title.trim().length > 0 ? "active" : "draft";

  return {
    store_id: storeId,
    slug: service.slug,
    title: service.title.trim() || "Untitled service",
    description: service.description,
    short_description: service.shortDescription || null,
    price: service.price ?? 0,
    delivery_days: service.deliveryDays,
    thumbnail_url: service.thumbnailUrl || null,
    status,
    category: service.category,
    gallery_urls: service.galleryUrls ?? [],
    video_url: service.videoUrl || null,
    faq: service.faq ?? [],
    revisions_included: service.revisionsIncluded,
    sales_count: service.salesCount ?? 0,
    is_featured: service.isFeatured,
    is_sponsored: service.isSponsored,
    is_new: service.isNew,
    rating_avg: service.rating ?? 0,
    review_count: service.reviewCount ?? 0,
    published_at: service.isNew ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function listAddonsByServiceIds(serviceIds: string[]): Promise<Record<string, ServiceAddon[]>> {
  if (serviceIds.length === 0) return {};

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_addons")
    .select("*")
    .in("service_id", serviceIds);

  if (error) throw error;

  const grouped: Record<string, ServiceAddon[]> = {};
  for (const row of data ?? []) {
    const serviceId = row.service_id as string;
    if (!grouped[serviceId]) grouped[serviceId] = [];
    grouped[serviceId].push(mapAddonRow(row as DbAddonRow));
  }

  return grouped;
}

async function replaceAddonsForService(serviceId: string, addons: ServiceAddon[]): Promise<void> {
  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("service_addons").delete().eq("service_id", serviceId);
  if (deleteError) throw deleteError;

  if (addons.length === 0) return;

  const rows = addons.map((addon) => ({
    service_id: serviceId,
    title: addon.title.trim(),
    description: addon.description?.trim() || null,
    price: addon.price,
    extra_days: addon.extraDays,
  }));

  const { error } = await admin.from("service_addons").insert(rows);
  if (error) throw error;
}

async function listExistingSlugsForStore(storeId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("freelance_services").select("slug").eq("store_id", storeId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug as string));
}

export async function generateUniqueServiceSlug(
  storeId: string,
  title: string,
  extraSlugs?: Set<string>
): Promise<string> {
  const base = slugifyName(title) || `service-${Date.now().toString(36)}`;
  const existing = await listExistingSlugsForStore(storeId);
  if (extraSlugs) {
    for (const slug of extraSlugs) existing.add(slug);
  }
  return uniqueSlug(base, existing);
}


export async function listServicesByStoreFromSupabase(
  storeId: string,
  store: StoreContext,
  options?: { activeOnly?: boolean }
): Promise<MarketplaceService[]> {
  const admin = createAdminClient();
  let query = admin.from("freelance_services").select("*").eq("store_id", storeId).order("created_at", {
    ascending: false,
  });

  if (options?.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as DbServiceRow[];
  const addonsByService = await listAddonsByServiceIds(rows.map((row) => row.id));

  return rows.map((row) => mapServiceRow(row, store, addonsByService[row.id] ?? []));
}

export async function listActiveMarketplaceServicesFromSupabase(): Promise<MarketplaceService[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_services")
    .select("*, freelancer_stores(id, slug, store_name, logo_url)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<
    DbServiceRow & {
      freelancer_stores: { id: string; slug: string; store_name: string; logo_url: string | null } | null;
    }
  >;
  const addonsByService = await listAddonsByServiceIds(rows.map((row) => row.id));

  return rows
    .map((row) => {
      const store = row.freelancer_stores;
      if (!store) return null;
      return mapServiceRow(
        row,
        {
          id: store.id,
          slug: store.slug,
          storeName: store.store_name,
          logoUrl: store.logo_url ?? undefined,
        },
        addonsByService[row.id] ?? []
      );
    })
    .filter((service): service is MarketplaceService => Boolean(service));
}

export async function getServiceBySlugFromSupabase(slug: string): Promise<MarketplaceService | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_services")
    .select("*, freelancer_stores(id, slug, store_name, logo_url)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbServiceRow & {
    freelancer_stores: { id: string; slug: string; store_name: string; logo_url: string | null } | null;
  };
  const store = row.freelancer_stores;
  if (!store) return null;

  const addonsByService = await listAddonsByServiceIds([row.id]);
  return mapServiceRow(
    row,
    {
      id: store.id,
      slug: store.slug,
      storeName: store.store_name,
      logoUrl: store.logo_url ?? undefined,
    },
    addonsByService[row.id] ?? []
  );
}

export async function replaceServicesForStoreInSupabase(
  store: FreelancerStore,
  services: MarketplaceService[]
): Promise<MarketplaceService[]> {
  const admin = createAdminClient();
  const storeId = store.id;

  const { data: existingRows, error: existingError } = await admin
    .from("freelance_services")
    .select("id")
    .eq("store_id", storeId);

  if (existingError) throw existingError;

  const existingIds = new Set((existingRows ?? []).map((row) => row.id as string));
  const keptIds = new Set<string>();
  const usedSlugs = new Set<string>();
  const saved: MarketplaceService[] = [];

  for (const service of services) {
    let slug = service.slug;
    if (!slug || usedSlugs.has(slug)) {
      slug = await generateUniqueServiceSlug(storeId, service.title || slug, usedSlugs);
    }
    usedSlugs.add(slug);

    const row = mapServiceToRow(storeId, { ...service, slug });
    let serviceId = service.id;

    if (isValidBillingUuid(serviceId) && existingIds.has(serviceId)) {
      const { data, error } = await admin
        .from("freelance_services")
        .update(row)
        .eq("id", serviceId)
        .eq("store_id", storeId)
        .select("*")
        .single();

      if (error) throw error;
      await replaceAddonsForService(serviceId, service.addons ?? []);
      keptIds.add(serviceId);
      saved.push(
        mapServiceRow(data as DbServiceRow, {
          id: store.id,
          slug: store.slug,
          storeName: store.storeName,
          logoUrl: store.logoUrl,
        }, service.addons ?? [])
      );
      continue;
    }

    const { data, error } = await admin
      .from("freelance_services")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;
    serviceId = (data as DbServiceRow).id;
    await replaceAddonsForService(serviceId, service.addons ?? []);
    keptIds.add(serviceId);

    const addonsByService = await listAddonsByServiceIds([serviceId]);
    saved.push(
      mapServiceRow(data as DbServiceRow, {
        id: store.id,
        slug: store.slug,
        storeName: store.storeName,
        logoUrl: store.logoUrl,
      }, addonsByService[serviceId] ?? [])
    );
  }

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await admin.from("freelance_services").delete().in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  return saved;
}

export async function migrateJsonServicesToSupabase(
  store: FreelancerStore,
  services: MarketplaceService[]
): Promise<number> {
  if (services.length === 0) return 0;
  await replaceServicesForStoreInSupabase(store, services);
  return services.length;
}
