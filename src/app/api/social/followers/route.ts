import { NextResponse } from "next/server";
import { getCompanyByAccountId, getCompanyById } from "@/lib/company/company-store";
import {
  getFollowerCount,
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
  const requestedTargetId = searchParams.get("targetId")?.trim();
  const targetType = (searchParams.get("targetType") ?? "user") as FollowTargetType;

  if (targetType !== "user" && targetType !== "company") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (targetType === "user") {
    const ownerAccountId = requestedTargetId ?? auth.user.id;
    if (ownerAccountId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [followers, followerCount] = await Promise.all([
      listFollowersForOwner(ownerAccountId),
      getFollowerCount(ownerAccountId, "user"),
    ]);

    return NextResponse.json({
      ownerAccountId,
      followers,
      followerCount,
    });
  }

  if (!requestedTargetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  const company = await getCompanyById(requestedTargetId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const ownerCompany = await getCompanyByAccountId(auth.user.id);
  if (!ownerCompany || ownerCompany.id !== requestedTargetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [followers, followerCount] = await Promise.all([
    listCompanyFollowersForOwner(requestedTargetId),
    getFollowerCount(requestedTargetId, "company"),
  ]);

  return NextResponse.json({
    ownerAccountId: auth.user.id,
    companyId: requestedTargetId,
    followers,
    followerCount,
  });
}
