import { NextResponse } from "next/server";
import { listAllMarketplaceServices } from "@/lib/profile/profile-store";

export async function GET() {
  return NextResponse.json({ services: listAllMarketplaceServices() });
}
