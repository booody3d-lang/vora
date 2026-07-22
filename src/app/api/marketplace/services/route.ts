import { NextResponse } from "next/server";
import {
  isServicesPersistenceActive,
  listActiveMarketplaceServices,
} from "@/lib/freelance/services-store";

export async function GET() {
  const services = await listActiveMarketplaceServices();
  return NextResponse.json({
    services,
    persistence: isServicesPersistenceActive() ? "supabase" : "json",
  });
}
