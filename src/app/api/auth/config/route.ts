import { NextResponse } from "next/server";
import { DEMO_AUTH_ENABLED } from "@/lib/security/client-auth";

export async function GET() {
  return NextResponse.json({
    demoAuthEnabled: DEMO_AUTH_ENABLED,
    requirePassword: true,
    platformOwnerEmail: "booody3d@gmail.com",
  });
}
