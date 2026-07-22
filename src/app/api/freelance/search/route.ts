import { NextResponse } from "next/server";
import { listActiveMarketplaceServices } from "@/lib/freelance/services-store";
import { getStoreBySlugLive } from "@/lib/freelance/store-store";
import { searchIndex } from "@/lib/search/search-index";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const [serviceHits, storeHits, services] = await Promise.all([
    searchIndex(q, { type: "service", limit: 24 }),
    searchIndex(q, { type: "store", limit: 12 }),
    listActiveMarketplaceServices(),
  ]);

  const serviceSlugs = new Set(serviceHits.map((hit) => hit.slug));
  const storeSlugs = new Set(storeHits.map((hit) => hit.slug));

  const matchedServices = q.trim()
    ? services.filter((service) => serviceSlugs.has(service.slug))
    : services;

  const stores = await Promise.all(
    [...storeSlugs].map(async (slug) => getStoreBySlugLive(slug))
  );

  return NextResponse.json({
    query: q,
    services: matchedServices,
    stores: stores.filter(Boolean),
  });
}
