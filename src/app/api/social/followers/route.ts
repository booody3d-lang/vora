import { NextResponse } from "next/server";
import { getCompanyByAccountId, getCompanyById } from "@/lib/company/company-store";
import {
  listCompanyFollowersForOwner,
  listFollowersForOwner,
  type FollowTargetType,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetId")?.trim();
  const targetType = (searchParams.get("targetType") ?? "user") as FollowTargetType;

  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  if (targetType !== "user" && targetType !== "company") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (targetType === "user") {
    if (auth.user.id !== targetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const followers = await listFollowersForOwner(targetId);
    return NextResponse.json({ followers });
  }

  const company = await getCompanyById(targetId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const ownerCompany = await getCompanyByAccountId(auth.user.id);
  if (!ownerCompany || ownerCompany.id !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const followers = await listCompanyFollowersForOwner(targetId);
  return NextResponse.json({ followers });
}
